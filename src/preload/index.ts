import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type PetBuddyApi } from "@shared/api";

const api: PetBuddyApi = {
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, patch),
  },
  appearanceScenes: {
    uploadCustomGif: (appearanceId, scene) =>
      ipcRenderer.invoke(IPC_CHANNELS.sceneAssetUpload, appearanceId, scene),
    clearCustomGif: (appearanceId, scene) =>
      ipcRenderer.invoke(IPC_CHANNELS.sceneAssetClear, appearanceId, scene),
  },
  pet: {
    onEvent: (listener) => {
      const wrapped = (
        _event: Electron.IpcRendererEvent,
        payload: Parameters<typeof listener>[0],
      ) => listener(payload);
      ipcRenderer.on(IPC_CHANNELS.petEvent, wrapped);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.petEvent, wrapped);
    },
    acknowledge: (reminderId) =>
      ipcRenderer.invoke(IPC_CHANNELS.petAcknowledge, reminderId),
    snoozeBreak: (delayMs) =>
      ipcRenderer.invoke(IPC_CHANNELS.petSnoozeBreak, delayMs),
    muteBreakForToday: () =>
      ipcRenderer.invoke(IPC_CHANNELS.petMuteBreakForToday),
    completeBreak: () => ipcRenderer.invoke(IPC_CHANNELS.petCompleteBreak),
    completeHydration: (reminderId) =>
      ipcRenderer.invoke(IPC_CHANNELS.petCompleteHydration, reminderId),
    setPosition: (position) =>
      ipcRenderer.invoke(IPC_CHANNELS.petSetPosition, position),
  },
  permissions: {
    getAccessibilityStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.permissionsGet),
    openAccessibilitySettings: () =>
      ipcRenderer.invoke(IPC_CHANNELS.permissionsOpen),
  },
  app: {
    openSettings: () => ipcRenderer.invoke(IPC_CHANNELS.appOpenSettings),
    toggleFocusMode: (enabled) =>
      ipcRenderer.invoke(IPC_CHANNELS.appToggleFocusMode, enabled),
    startFocusSession: () =>
      ipcRenderer.invoke(IPC_CHANNELS.appStartFocusSession),
    stopFocusSession: () =>
      ipcRenderer.invoke(IPC_CHANNELS.appStopFocusSession),
    pauseFocusSessionForBreak: () =>
      ipcRenderer.invoke(IPC_CHANNELS.appPauseFocusSessionForBreak),
    resumeFocusSessionAfterBreak: () =>
      ipcRenderer.invoke(IPC_CHANNELS.appResumeFocusSessionAfterBreak),
    showPetContextMenu: () =>
      ipcRenderer.invoke(IPC_CHANNELS.appShowPetContextMenu),
    setPetMousePassthrough: (enabled) =>
      ipcRenderer.invoke(IPC_CHANNELS.appSetPetMousePassthrough, enabled),
    setPetWindowContentWidth: (width) =>
      ipcRenderer.invoke(IPC_CHANNELS.appSetPetWindowContentWidth, width),
  },
  updates: {
    checkNow: () => ipcRenderer.invoke(IPC_CHANNELS.updatesCheck),
    download: () => ipcRenderer.invoke(IPC_CHANNELS.updatesDownload),
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.updatesStatus),
    onStateChanged: (listener) => {
      const wrapped = (
        _event: Electron.IpcRendererEvent,
        payload: Parameters<typeof listener>[0],
      ) => listener(payload);
      ipcRenderer.on(IPC_CHANNELS.updatesStateChanged, wrapped);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.updatesStateChanged, wrapped);
    },
    openReleasesPage: () =>
      ipcRenderer.invoke(IPC_CHANNELS.updatesOpenReleases),
  },
  stats: {
    getToday: () => ipcRenderer.invoke(IPC_CHANNELS.statsToday),
    getRecent: (days) => ipcRenderer.invoke(IPC_CHANNELS.statsRecent, days),
  },
  apps: {
    pickDistractingApp: () =>
      ipcRenderer.invoke(IPC_CHANNELS.appsPickDistracting),
  },
};

contextBridge.exposeInMainWorld("petBuddy", api);
