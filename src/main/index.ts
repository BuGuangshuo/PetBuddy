import { app, dialog, net, protocol, shell } from "electron";
import { join } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { config as loadEnv } from "dotenv";
import { createPetCatalog, LOCAL_ASSET_PROTOCOL } from "./services/petCatalog";

// 加载 .env 文件（仅在开发环境）
if (!app.isPackaged) {
  const envPath = join(process.cwd(), '.env');
  loadEnv({ path: envPath });
  console.log('[Main] Loaded .env configuration');
}
import {
  getAccessibilityStatus,
  openAccessibilitySettings,
  promptForAccessibilityIfNeeded,
} from "./services/permissions";
import { FocusMonitorService, initializeFocusMonitor } from "./services/focusMonitor";
import { registerIpc, emitPetEvent } from "./ipc/registerIpc";
import { ReminderService } from "./services/reminderService";
import { PetBuddyStore } from "./services/store";
import { UpdateService } from "./services/updateService";
import { WindowManager } from "./services/windowManager";
import { readDeviceInfo } from "./services/deviceInfo";
import {
  pickDistractingApp,
  resolveDistractingAppLabel,
} from "./services/distractingAppPicker";
import {
  createFocusSession,
  getElapsedFocusSessionSeconds,
  getFocusSessionStatus,
  isFocusSessionActive,
} from "@shared/focusSession";
import type { AppSettings, PetPosition, ReminderKind } from "@shared/types";
import { IPC_CHANNELS, type RendererPetAppearance, type SettingsPayload } from "@shared/api";

const isMacArm64 = process.platform === "darwin" && process.arch === "arm64";
const isWindows = process.platform === "win32";
const FOCUS_DONE_DURATION_MS = 3000;

// macOS specific keychain mock
if (process.platform === "darwin") {
  app.commandLine.appendSwitch("use-mock-keychain");
}

// Hide dock on macOS
if (process.platform === "darwin") {
  app.dock?.hide();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: LOCAL_ASSET_PROTOCOL,
    privileges: {
      supportFetchAPI: true,
      secure: true,
      standard: true,
    },
  },
]);

let appearances: RendererPetAppearance[] = [];
type FocusPauseReason = "break" | "focusNudge";

const main = async (): Promise<void> => {
  await app.whenReady();

  protocol.handle(LOCAL_ASSET_PROTOCOL, (request) => {
    const absolutePath = new URL(request.url).searchParams.get("path");

    if (!absolutePath) {
      return new Response("Missing asset path.", { status: 400 });
    }

    return net.fetch(pathToFileURL(absolutePath).href);
  });

  if (!isMacArm64 && !app.isPackaged) {
    console.warn("PetBuddy was originally designed for Apple Silicon Macs, but now supports Windows and other platforms.");
  }
  
  // 初始化平台特定的焦点监控功能
  initializeFocusMonitor();
  
  const deviceInfo = readDeviceInfo();

  const store = new PetBuddyStore();
  const updateService = new UpdateService(store.getAppVersion());
  const preloadPath = join(__dirname, "../preload/index.mjs");
  const windows = new WindowManager(preloadPath);
  const assetRoot = app.isPackaged
    ? join(app.getAppPath(), "pet_assets")
    : join(process.cwd(), "pet_assets");

  const rebuildAppearances = (): void => {
    appearances = createPetCatalog(
      assetRoot,
      process.env.ELECTRON_RENDERER_URL,
      store.getSettings().customSceneGifs,
    );
  };

  rebuildAppearances();
  if (store.isFirstLaunch()) {
    store.updateSettings({ petPosition: windows.getDefaultPetPosition() });
  }
  windows.createPetWindow(store.getSettings().petPosition);
  windows.createSettingsWindow();

  let activeFocusSession: import("@shared/types").FocusSession | null = null;
  let pausedFocusRemainingMs: number | null = null;
  let pausedFocusReason: FocusPauseReason | null = null;
  let pausedFocusReminderId: string | null = null;
  let focusSessionTimer: NodeJS.Timeout | null = null;
  let focusDoneUntil: number | null = null;
  let focusDoneTimer: NodeJS.Timeout | null = null;
  const shownReminderIds = new Set<string>();

  const clearFocusTimers = (): void => {
    if (focusSessionTimer) {
      clearTimeout(focusSessionTimer);
      focusSessionTimer = null;
    }

    if (focusDoneTimer) {
      clearTimeout(focusDoneTimer);
      focusDoneTimer = null;
    }
  };

  const readFocusSessionState = () => {
    const now = Date.now();

    if (activeFocusSession && !isFocusSessionActive(activeFocusSession, now)) {
      const elapsedFocusSeconds = getElapsedFocusSessionSeconds(
        activeFocusSession,
        now,
      );
      if (elapsedFocusSeconds > 0) {
        store.addFocusDurationSeconds(elapsedFocusSeconds);
      }
      activeFocusSession = null;
      focusSessionTimer = null;
      activateFocusDoneState(now);
    }

    if (focusDoneUntil !== null && focusDoneUntil <= now) {
      focusDoneUntil = null;
    }

    return {
      session: activeFocusSession,
      status:
        activeFocusSession !== null
          ? getFocusSessionStatus(activeFocusSession, now)
          : pausedFocusRemainingMs !== null
            ? "paused"
            : focusDoneUntil !== null
              ? "done"
              : "idle",
      doneEndsAt: focusDoneUntil,
      pausedRemainingMs: pausedFocusRemainingMs,
    } as const;
  };

  const emitFocusSessionUpdate = (): void => {
    emitPetEvent(windows.petWindow, {
      type: "focus-session-updated",
      focusSession: readFocusSessionState(),
    });
  };

  const clearFocusDoneState = (): void => {
    focusDoneUntil = null;
    focusDoneTimer = null;
    emitFocusSessionUpdate();
  };

  const activateFocusDoneState = (now: number): void => {
    focusDoneUntil = now + FOCUS_DONE_DURATION_MS;
    if (focusDoneTimer) {
      clearTimeout(focusDoneTimer);
    }
    focusDoneTimer = setTimeout(
      () => clearFocusDoneState(),
      FOCUS_DONE_DURATION_MS,
    );
  };

  const completeFocusSession = (options?: { showBubble?: boolean }): void => {
    const now = Date.now();
    const elapsedFocusSeconds = getElapsedFocusSessionSeconds(
      activeFocusSession,
      now,
    );
    if (elapsedFocusSeconds > 0) {
      store.addFocusDurationSeconds(elapsedFocusSeconds);
    }
    activeFocusSession = null;
    pausedFocusRemainingMs = null;
    pausedFocusReason = null;
    pausedFocusReminderId = null;
    focusSessionTimer = null;
    activateFocusDoneState(now);
    emitFocusSessionUpdate();

    if (options?.showBubble) {
      emitPetEvent(windows.petWindow, {
        type: "focus-session-completed",
        message: "收工！我陪你休息会",
      });
    }
  };

  const startFocusSession = (): SettingsPayload => {
    clearFocusTimers();
    focusDoneUntil = null;
    pausedFocusRemainingMs = null;
    pausedFocusReason = null;
    pausedFocusReminderId = null;
    const focusSessionMinutes = store.getSettings().focusSessionMinutes;
    activeFocusSession = createFocusSession(Date.now(), focusSessionMinutes);
    const durationMs = Math.max(0, activeFocusSession.endsAt - Date.now());
    focusSessionTimer = setTimeout(
      () => completeFocusSession({ showBubble: true }),
      durationMs,
    );
    emitPetEvent(windows.petWindow, {
      type: "focus-session-started",
      message: `好，我帮你看着这 ${focusSessionMinutes} 分钟！`,
    });
    emitFocusSessionUpdate();
    return buildSettingsPayload();
  };

  const stopFocusSession = (): SettingsPayload => {
    clearFocusTimers();
    completeFocusSession({ showBubble: true });
    return buildSettingsPayload();
  };

  const pauseFocusSession = (
    reason: FocusPauseReason,
    reminderId?: string,
  ): SettingsPayload => {
    const now = Date.now();

    if (!activeFocusSession) {
      return buildSettingsPayload();
    }

    pausedFocusRemainingMs = Math.max(0, activeFocusSession.endsAt - now);
    pausedFocusReason = reason;
    pausedFocusReminderId = reminderId ?? null;
    activeFocusSession = null;
    if (focusSessionTimer) {
      clearTimeout(focusSessionTimer);
      focusSessionTimer = null;
    }
    emitFocusSessionUpdate();
    return buildSettingsPayload();
  };

  const pauseFocusSessionForBreak = (): SettingsPayload =>
    pauseFocusSession("break");

  const pauseFocusSessionForFocusNudge = (
    reminderId: string,
  ): SettingsPayload => pauseFocusSession("focusNudge", reminderId);

  const resumePausedFocusSession = (
    reason: FocusPauseReason,
    reminderId?: string,
  ): SettingsPayload => {
    if (pausedFocusRemainingMs === null || pausedFocusReason !== reason) {
      return buildSettingsPayload();
    }

    if (
      reason === "focusNudge" &&
      pausedFocusReminderId !== null &&
      reminderId !== pausedFocusReminderId
    ) {
      return buildSettingsPayload();
    }

    const now = Date.now();
    activeFocusSession = {
      startedAt: now,
      endsAt: now + pausedFocusRemainingMs,
    };
    const durationMs = Math.max(0, activeFocusSession.endsAt - now);
    pausedFocusRemainingMs = null;
    pausedFocusReason = null;
    pausedFocusReminderId = null;
    focusSessionTimer = setTimeout(
      () => completeFocusSession({ showBubble: true }),
      durationMs,
    );
    emitFocusSessionUpdate();
    return buildSettingsPayload();
  };

  const resumeFocusSessionAfterBreak = (): SettingsPayload =>
    resumePausedFocusSession("break");

  const resumeFocusSessionAfterFocusNudge = (
    reminderId: string,
  ): SettingsPayload => resumePausedFocusSession("focusNudge", reminderId);

  const clearFocusNudges = (): void => {
    reminderService.clearByKind("focusNudge");

    if (
      pausedFocusReason === "focusNudge" &&
      pausedFocusRemainingMs !== null
    ) {
      resumePausedFocusSession("focusNudge", pausedFocusReminderId ?? undefined);
    }
  };

  const buildSettingsPayload = (): SettingsPayload => ({
    settings: store.getSettings(),
    distractingAppLabels: Object.fromEntries(
      store
        .getSettings()
        .distractingApps.map((appId) => [appId, resolveDistractingAppLabel(appId)]),
    ),
    focusSession: readFocusSessionState(),
    appearances,
    permissionState: getAccessibilityStatus(),
    updateState: updateService.getState(),
    version: store.getAppVersion(),
    isMacArm64,
    isWindows,
    deviceModelName: deviceInfo.modelName,
    deviceChipName: deviceInfo.chipName,
  });

  updateService.onStateChanged((nextUpdateState) => {
    windows.settingsWindow?.webContents.send(
      IPC_CHANNELS.updatesStateChanged,
      nextUpdateState,
    );
  });

  const emitAppearanceChanged = (
    appearanceId: AppSettings["selectedPetAppearance"],
  ): void => {
    const appearance =
      appearances.find((item) => item.id === appearanceId) ?? appearances[0];
    if (appearance) {
      emitPetEvent(windows.petWindow, {
        type: "appearance-changed",
        appearance,
      });
    }
  };

  const completeHydration = (): void => {
    store.markReminderAcknowledged("water");
    emitPetEvent(windows.petWindow, { type: "hydration-completed" });
  };

  const completeHydrationReminder = (id: string): void => {
    store.markReminderAcknowledged("water");
    reminderService.acknowledge(id);
    emitPetEvent(windows.petWindow, { type: "hydration-completed" });
  };

  const refreshSelectedAppearanceIfNeeded = (
    appearanceId: AppSettings["selectedPetAppearance"],
  ): void => {
    if (store.getSettings().selectedPetAppearance === appearanceId) {
      emitAppearanceChanged(appearanceId);
    }
  };

  const reminderService = new ReminderService({
    getSettings: () => store.getSettings(),
    onReminder: (event) => {
      if (!shownReminderIds.has(event.id)) {
        shownReminderIds.add(event.id);
        store.markReminderShown(event.kind);
      }
      if (event.kind === "focusNudge") {
        pauseFocusSessionForFocusNudge(event.id);
      }
      windows.ensurePetVisibleForReminder(event);
      emitPetEvent(windows.petWindow, { type: "reminder", event });
      void windows.playReminderMotion(event);
    },
    onReminderFinished: (event) => {
      emitPetEvent(windows.petWindow, {
        type: "reminder-finished",
        eventId: event.id,
      });
    },
  });

  const focusMonitor = new FocusMonitorService({
    getSettings: () => store.getSettings(),
    shouldMonitor: () => readFocusSessionState().status === "active",
    hasPermission: () => getAccessibilityStatus() === "granted",
    onDistractedDelta: (seconds) => {
      store.addDistractedSeconds(seconds);
    },
    onFocusStreak: (seconds) => {
      store.setFocusStreak(seconds);
    },
    onNudge: () => reminderService.enqueue("focusNudge"),
  });

  windows.createTray(
    () => windows.showSettings(),
    () => windows.togglePetWindow(),
    () => {
      const settings = store.getSettings();
      void updateSettings({ focusModeEnabled: !settings.focusModeEnabled });
    },
    () => {
      void updateService.checkNow();
    },
    () => {
      reminderService.stop();
      focusMonitor.stop();
      app.exit(0);
    },
  );

  windows.createApplicationMenu({
    appName: app.name,
    onOpenSettings: () => windows.showSettings(),
    onTogglePet: () => windows.togglePetWindow(),
    onQuit: () => {
      reminderService.stop();
      focusMonitor.stop();
      app.exit(0);
    },
  });

  const updateSettings = async (
    patch: Partial<AppSettings>,
    options?: { promptIfDenied?: boolean },
  ): Promise<SettingsPayload> => {
    let nextPatch = patch;
    const promptIfDenied = options?.promptIfDenied ?? true;

    if (patch.focusModeEnabled) {
      const permission = getAccessibilityStatus();
      if (promptIfDenied && permission !== "granted") {
        promptForAccessibilityIfNeeded();
        nextPatch = {
          ...patch,
          focusModeEnabled: false,
          focusModePendingEnable: true,
        };
      } else if (permission !== "granted") {
        nextPatch = {
          ...patch,
          focusModeEnabled: false,
          focusModePendingEnable: false,
        };
      } else {
        nextPatch = {
          ...patch,
          focusModeEnabled: true,
          focusModePendingEnable: false,
        };
      }
    }

    if (patch.focusModeEnabled === false) {
      nextPatch = {
        ...nextPatch,
        focusModeEnabled: false,
        focusModePendingEnable: false,
      };
    }

    const nextSettings = store.updateSettings(nextPatch);
    if (patch.focusModeEnabled === false) {
      clearFocusNudges();
    }
    if (typeof patch.launchAtLogin === "boolean") {
      app.setLoginItemSettings({ openAtLogin: nextSettings.launchAtLogin });
    }
    if (patch.petPosition) {
      windows.movePet(nextSettings.petPosition);
      emitPetEvent(windows.petWindow, {
        type: "position-changed",
        position: nextSettings.petPosition,
      });
    }

    if (patch.selectedPetAppearance) {
      emitAppearanceChanged(patch.selectedPetAppearance);
    }

    reminderService.refresh();
    return buildSettingsPayload();
  };

  registerIpc({
    getSettingsPayload: buildSettingsPayload,
    updateSettings,
    uploadCustomSceneGif: async (appearanceId, scene) => {
      const selection = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "GIF", extensions: ["gif"] }],
      });

      if (selection.canceled || selection.filePaths.length === 0) {
        return buildSettingsPayload();
      }

      store.setCustomSceneGif(appearanceId, scene, selection.filePaths[0]);
      rebuildAppearances();
      refreshSelectedAppearanceIfNeeded(appearanceId);
      return buildSettingsPayload();
    },
    clearCustomSceneGif: async (appearanceId, scene) => {
      store.clearCustomSceneGif(appearanceId, scene);
      rebuildAppearances();
      refreshSelectedAppearanceIfNeeded(appearanceId);
      return buildSettingsPayload();
    },
    acknowledgeReminder: async (id: string) => {
      const kind = id.split("-")[0] as ReminderKind;
      if (kind !== "water") {
        store.markReminderAcknowledged(kind);
      }
      reminderService.acknowledge(id);
      if (kind === "focusNudge") {
        resumeFocusSessionAfterFocusNudge(id);
      }
    },
    snoozeBreakReminder: async (delayMs: number) => {
      reminderService.snoozeBreak(delayMs);
    },
    muteBreakReminderForToday: async () => {
      store.muteBreakRemindersForToday();
    },
    completeBreakReminder: async () => {
      store.markReminderAcknowledged("break");
      reminderService.completeBreak();
    },
    completeHydration: async (id: string) => {
      completeHydrationReminder(id);
    },
    movePetPosition: async (position: PetPosition) => {
      windows.movePet(position);
    },
    setPetPosition: async (position: PetPosition) => {
      await updateSettings({ petPosition: position });
    },
    getPermissionState: getAccessibilityStatus,
    openAccessibilitySettings,
    openSettings: async () => windows.showSettings(),
    toggleFocusMode: async (enabled: boolean, promptIfDenied = true) =>
      updateSettings({ focusModeEnabled: enabled }, { promptIfDenied }),
    startFocusSession: async () => startFocusSession(),
    stopFocusSession: async () => stopFocusSession(),
    pauseFocusSessionForBreak: async () => pauseFocusSessionForBreak(),
    resumeFocusSessionAfterBreak: async () => resumeFocusSessionAfterBreak(),
    showPetContextMenu: async () => {
      const focusSession = readFocusSessionState();
      windows.showPetContextMenu({
        onOpenSettings: () => windows.showSettings(),
        onHydrationComplete: () => completeHydration(),
        onStartBreak: () => {
          reminderService.completeBreak();
          emitPetEvent(windows.petWindow, { type: "break-started" });
        },
        onToggleFocus: () => {
          if (readFocusSessionState().status === "active") {
            stopFocusSession();
            return;
          }

          if (
            readFocusSessionState().status === "paused" &&
            pausedFocusReason === "break"
          ) {
            resumeFocusSessionAfterBreak();
            return;
          }

          if (
            readFocusSessionState().status === "paused" &&
            pausedFocusReason === "focusNudge"
          ) {
            return;
          }

          startFocusSession();
        },
        onTogglePet: () => windows.togglePetWindow(),
        focusSessionActive: focusSession.status === "active",
      });
    },
    setPetMousePassthrough: async (enabled: boolean) => {
      windows.setPetWindowMousePassthrough(enabled);
    },
    setPetWindowContentWidth: async (width: number) => {
      windows.setPetWindowContentWidth(width);
    },
    checkUpdates: async () => updateService.checkNow(),
    downloadUpdate: async () => updateService.downloadUpdate(),
    getUpdateStatus: () => updateService.getState(),
    openReleasesPage: async () => updateService.openReleasesPage(),
    getTodayStats: () => store.getTodayStats(),
    getRecentStats: (days: number) => store.getRecentStats(days),
    pickDistractingApp: async () =>
      pickDistractingApp((options) => dialog.showOpenDialog(options)),
    getChangelogContent: () => {
      try {
        const changelogPath = app.isPackaged
          ? join(app.getAppPath(), "USER_CHANGELOG.md")
          : join(process.cwd(), "USER_CHANGELOG.md");
        const fullContent = readFileSync(changelogPath, "utf-8");
        const currentVersion = store.getAppVersion();
        
        // 提取当前版本的更新内容（匹配任意 emoji）
        const versionPattern = new RegExp(`## .+ v${currentVersion.replace(/\./g, '\\.')}[\\s\\S]*?(?=\\n## |$)`, 'i');
        const match = fullContent.match(versionPattern);
        
        if (match) {
          return match[0];
        }
        
        // 如果没有找到当前版本，返回第一个版本的内容
        const firstVersionPattern = /## .+ v[\d.]+[\s\S]*?(?=\n## |$)/i;
        const firstMatch = fullContent.match(firstVersionPattern);
        return firstMatch ? firstMatch[0] : fullContent;
      } catch (error) {
        console.error("Failed to read changelog:", error);
        return "无法加载更新日志";
      }
    },
    getChangelogDecorationGif: () => {
      try {
        const decorationDir = app.isPackaged
          ? join(app.getAppPath(), "pet_assets", "ChangeLogModal")
          : join(process.cwd(), "pet_assets", "ChangeLogModal");
        
        const files = readdirSync(decorationDir).filter(f => f.toLowerCase().endsWith('.gif'));
        if (files.length === 0) {
          return "";
        }
        
        const gifPath = join(decorationDir, files[0]);
        return `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(gifPath)}`;
      } catch (error) {
        console.error("Failed to get decoration gif:", error);
        return "";
      }
    },
  });

  if (store.getSettings().checkUpdatesOnStartup) {
    void updateService.checkNow();
  }

  reminderService.start();
  focusMonitor.start();

  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });
  });
};

void main();
