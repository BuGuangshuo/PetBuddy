import type {
  AppSettings,
  DailyStats,
  FocusSessionState,
  PermissionState,
  PetAnimation,
  PetAppearance,
  PetAppearanceId,
  PetPosition,
  PetSceneKey,
  ReminderEvent,
  UpdateState,
} from "./types";

export interface RendererSceneAsset {
  scene: PetSceneKey;
  label: string;
  description: string;
  required: boolean;
  defaultAssets: string[];
  customAsset: string | null;
}

export interface RendererPetAppearance extends Omit<PetAppearance, "assets"> {
  assets: Record<PetAnimation, string[]>;
  sceneAssets: RendererSceneAsset[];
}

export interface SettingsPayload {
  settings: AppSettings;
  distractingAppLabels: Record<string, string>;
  focusSession: FocusSessionState;
  appearances: RendererPetAppearance[];
  permissionState: PermissionState;
  updateState: UpdateState;
  version: string;
  isMacArm64: boolean;
  isWindows: boolean;
  deviceModelName: string | null;
  deviceChipName: string | null;
}

export type PetEvent =
  | { type: "reminder"; event: ReminderEvent }
  | { type: "reminder-finished"; eventId: string }
  | { type: "break-started" }
  | { type: "hydration-completed" }
  | { type: "appearance-changed"; appearance: RendererPetAppearance }
  | { type: "position-changed"; position: PetPosition }
  | { type: "focus-session-started"; message: string }
  | { type: "focus-session-completed"; message: string }
  | { type: "focus-session-updated"; focusSession: FocusSessionState };

export interface PetBuddyApi {
  settings: {
    get(): Promise<SettingsPayload>;
    update(patch: Partial<AppSettings>): Promise<SettingsPayload>;
  };
  appearanceScenes: {
    uploadCustomGif(
      appearanceId: PetAppearanceId,
      scene: PetSceneKey,
    ): Promise<SettingsPayload>;
    clearCustomGif(
      appearanceId: PetAppearanceId,
      scene: PetSceneKey,
    ): Promise<SettingsPayload>;
  };
  pet: {
    onEvent(listener: (event: PetEvent) => void): () => void;
    acknowledge(reminderId: string): Promise<void>;
    snoozeBreak(delayMs: number): Promise<void>;
    muteBreakForToday(): Promise<void>;
    completeBreak(): Promise<void>;
    completeHydration(reminderId: string): Promise<void>;
    movePosition(position: PetPosition): Promise<void>;
    setPosition(position: PetPosition): Promise<void>;
  };
  permissions: {
    getAccessibilityStatus(): Promise<PermissionState>;
    openAccessibilitySettings(): Promise<void>;
  };
  app: {
    openSettings(): Promise<void>;
    toggleFocusMode(
      enabled: boolean,
      promptIfDenied?: boolean,
    ): Promise<SettingsPayload>;
    startFocusSession(): Promise<SettingsPayload>;
    stopFocusSession(): Promise<SettingsPayload>;
    pauseFocusSessionForBreak(): Promise<SettingsPayload>;
    resumeFocusSessionAfterBreak(): Promise<SettingsPayload>;
    showPetContextMenu(): Promise<void>;
    setPetMousePassthrough(enabled: boolean): Promise<void>;
    setPetWindowContentWidth(width: number): Promise<void>;
  };
  updates: {
    checkNow(): Promise<UpdateState>;
    download(): Promise<UpdateState>;
    getStatus(): Promise<UpdateState>;
    onStateChanged(listener: (state: UpdateState) => void): () => void;
    openReleasesPage(): Promise<void>;
  };
  stats: {
    getToday(): Promise<DailyStats>;
    getRecent(days: number): Promise<DailyStats[]>;
  };
  apps: {
    pickDistractingApp(): Promise<{ id: string; label: string } | null>;
  };
}

export const IPC_CHANNELS = {
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  sceneAssetUpload: "scene-asset:upload",
  sceneAssetClear: "scene-asset:clear",
  petAcknowledge: "pet:acknowledge",
  petSnoozeBreak: "pet:snooze-break",
  petMuteBreakForToday: "pet:mute-break-for-today",
  petCompleteBreak: "pet:complete-break",
  petCompleteHydration: "pet:complete-hydration",
  petMovePosition: "pet:move-position",
  petSetPosition: "pet:set-position",
  petEvent: "pet:event",
  permissionsGet: "permissions:get",
  permissionsOpen: "permissions:open",
  appOpenSettings: "app:open-settings",
  appToggleFocusMode: "app:toggle-focus-mode",
  appStartFocusSession: "app:start-focus-session",
  appStopFocusSession: "app:stop-focus-session",
  appPauseFocusSessionForBreak: "app:pause-focus-session-for-break",
  appResumeFocusSessionAfterBreak: "app:resume-focus-session-after-break",
  appShowPetContextMenu: "app:show-pet-context-menu",
  appSetPetMousePassthrough: "app:set-pet-mouse-passthrough",
  appSetPetWindowContentWidth: "app:set-pet-window-content-width",
  updatesCheck: "updates:check",
  updatesDownload: "updates:download",
  updatesStatus: "updates:status",
  updatesStateChanged: "updates:state-changed",
  updatesOpenReleases: "updates:open-releases",
  statsToday: "stats:today",
  statsRecent: "stats:recent",
  appsPickDistracting: "apps:pick-distracting",
} as const;
