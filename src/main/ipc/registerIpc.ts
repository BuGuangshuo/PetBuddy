import { ipcMain } from "electron";
import { IPC_CHANNELS } from "@shared/api";
import type { PetEvent, SettingsPayload } from "@shared/api";
import type {
  AppSettings,
  DailyStats,
  PermissionState,
  PetAppearanceId,
  PetPosition,
  PetSceneKey,
  UpdateState,
} from "@shared/types";

interface RegisterIpcOptions {
  getSettingsPayload: () => Promise<SettingsPayload> | SettingsPayload;
  updateSettings: (
    patch: Partial<AppSettings>,
  ) => Promise<SettingsPayload> | SettingsPayload;
  uploadCustomSceneGif: (
    appearanceId: PetAppearanceId,
    scene: PetSceneKey,
  ) => Promise<SettingsPayload> | SettingsPayload;
  clearCustomSceneGif: (
    appearanceId: PetAppearanceId,
    scene: PetSceneKey,
  ) => Promise<SettingsPayload> | SettingsPayload;
  acknowledgeReminder: (id: string) => Promise<void> | void;
  snoozeBreakReminder: (delayMs: number) => Promise<void> | void;
  muteBreakReminderForToday: () => Promise<void> | void;
  completeBreakReminder: () => Promise<void> | void;
  completeHydration: (id: string) => Promise<void> | void;
  setPetPosition: (position: PetPosition) => Promise<void> | void;
  getPermissionState: () => Promise<PermissionState> | PermissionState;
  openAccessibilitySettings: () => Promise<void> | void;
  openSettings: () => Promise<void> | void;
  toggleFocusMode: (
    enabled: boolean,
  ) => Promise<SettingsPayload> | SettingsPayload;
  startFocusSession: () => Promise<SettingsPayload> | SettingsPayload;
  stopFocusSession: () => Promise<SettingsPayload> | SettingsPayload;
  pauseFocusSessionForBreak: () => Promise<SettingsPayload> | SettingsPayload;
  resumeFocusSessionAfterBreak: () =>
    | Promise<SettingsPayload>
    | SettingsPayload;
  showPetContextMenu: () => Promise<void> | void;
  setPetMousePassthrough: (enabled: boolean) => Promise<void> | void;
  setPetWindowContentWidth: (width: number) => Promise<void> | void;
  checkUpdates: () => Promise<UpdateState>;
  downloadUpdate: () => Promise<UpdateState>;
  getUpdateStatus: () => Promise<UpdateState> | UpdateState;
  openReleasesPage: () => Promise<void> | void;
  getTodayStats: () => Promise<DailyStats> | DailyStats;
  getRecentStats: (days: number) => Promise<DailyStats[]> | DailyStats[];
  pickDistractingApp: () => Promise<string | null>;
}

export const registerIpc = (options: RegisterIpcOptions): void => {
  ipcMain.handle(IPC_CHANNELS.settingsGet, () => options.getSettingsPayload());
  ipcMain.handle(
    IPC_CHANNELS.settingsUpdate,
    (_event, patch: Partial<AppSettings>) => options.updateSettings(patch),
  );
  ipcMain.handle(
    IPC_CHANNELS.sceneAssetUpload,
    (_event, appearanceId: PetAppearanceId, scene: PetSceneKey) =>
      options.uploadCustomSceneGif(appearanceId, scene),
  );
  ipcMain.handle(
    IPC_CHANNELS.sceneAssetClear,
    (_event, appearanceId: PetAppearanceId, scene: PetSceneKey) =>
      options.clearCustomSceneGif(appearanceId, scene),
  );
  ipcMain.handle(IPC_CHANNELS.petAcknowledge, (_event, reminderId: string) =>
    options.acknowledgeReminder(reminderId),
  );
  ipcMain.handle(IPC_CHANNELS.petSnoozeBreak, (_event, delayMs: number) =>
    options.snoozeBreakReminder(delayMs),
  );
  ipcMain.handle(IPC_CHANNELS.petMuteBreakForToday, () =>
    options.muteBreakReminderForToday(),
  );
  ipcMain.handle(IPC_CHANNELS.petCompleteBreak, () =>
    options.completeBreakReminder(),
  );
  ipcMain.handle(
    IPC_CHANNELS.petCompleteHydration,
    (_event, reminderId: string) => options.completeHydration(reminderId),
  );
  ipcMain.handle(IPC_CHANNELS.petSetPosition, (_event, position: PetPosition) =>
    options.setPetPosition(position),
  );
  ipcMain.handle(IPC_CHANNELS.permissionsGet, () =>
    options.getPermissionState(),
  );
  ipcMain.handle(IPC_CHANNELS.permissionsOpen, () =>
    options.openAccessibilitySettings(),
  );
  ipcMain.handle(IPC_CHANNELS.appOpenSettings, () => options.openSettings());
  ipcMain.handle(IPC_CHANNELS.appToggleFocusMode, (_event, enabled: boolean) =>
    options.toggleFocusMode(enabled),
  );
  ipcMain.handle(IPC_CHANNELS.appStartFocusSession, () =>
    options.startFocusSession(),
  );
  ipcMain.handle(IPC_CHANNELS.appStopFocusSession, () =>
    options.stopFocusSession(),
  );
  ipcMain.handle(IPC_CHANNELS.appPauseFocusSessionForBreak, () =>
    options.pauseFocusSessionForBreak(),
  );
  ipcMain.handle(IPC_CHANNELS.appResumeFocusSessionAfterBreak, () =>
    options.resumeFocusSessionAfterBreak(),
  );
  ipcMain.handle(IPC_CHANNELS.appShowPetContextMenu, () =>
    options.showPetContextMenu(),
  );
  ipcMain.handle(
    IPC_CHANNELS.appSetPetMousePassthrough,
    (_event, enabled: boolean) => options.setPetMousePassthrough(enabled),
  );
  ipcMain.handle(
    IPC_CHANNELS.appSetPetWindowContentWidth,
    (_event, width: number) => options.setPetWindowContentWidth(width),
  );
  ipcMain.handle(IPC_CHANNELS.updatesCheck, () => options.checkUpdates());
  ipcMain.handle(IPC_CHANNELS.updatesDownload, () => options.downloadUpdate());
  ipcMain.handle(IPC_CHANNELS.updatesStatus, () => options.getUpdateStatus());
  ipcMain.handle(IPC_CHANNELS.updatesOpenReleases, () =>
    options.openReleasesPage(),
  );
  ipcMain.handle(IPC_CHANNELS.statsToday, () => options.getTodayStats());
  ipcMain.handle(IPC_CHANNELS.statsRecent, (_event, days: number) =>
    options.getRecentStats(days),
  );
  ipcMain.handle(IPC_CHANNELS.appsPickDistracting, () =>
    options.pickDistractingApp(),
  );
};

export const emitPetEvent = (
  window: Electron.BrowserWindow | null,
  event: PetEvent,
): void => {
  window?.webContents.send(IPC_CHANNELS.petEvent, event);
};
