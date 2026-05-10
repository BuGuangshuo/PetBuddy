import type {
  AppSettings,
  CustomSceneGifMap,
  DailyStats,
  ReminderKind,
  StoreShape,
} from "./types";

export const STORE_VERSION = 1;
export const STATS_RETENTION_DAYS = 30;
export const BREAK_PRIORITY = 3;
export const FOCUS_PRIORITY = 2;
export const WATER_PRIORITY = 1;

export const DEFAULT_DISTRACTING_APPS = [];

const DEFAULT_CUSTOM_SCENE_GIFS_SOURCE = Object.freeze({
  "line-dog": {},
  "golden-puppy": {},
} satisfies Record<"line-dog" | "golden-puppy", Record<string, never>>);

export const cloneDefaultCustomSceneGifs = (): CustomSceneGifMap => ({
  "line-dog": { ...DEFAULT_CUSTOM_SCENE_GIFS_SOURCE["line-dog"] },
  "golden-puppy": { ...DEFAULT_CUSTOM_SCENE_GIFS_SOURCE["golden-puppy"] },
});

export const defaultSettings: AppSettings = {
  breakIntervalMinutes: 50,
  breakRemindersMutedOnDate: null,
  waterIntervalMinutes: 30,
  focusSessionMinutes: 25,
  focusModeEnabled: false,
  focusModePendingEnable: false,
  focusGraceSeconds: 20,
  launchAtLogin: false,
  checkUpdatesOnStartup: false,
  selectedPetAppearance: "line-dog",
  petPosition: { x: 48, y: 48 },
  distractingApps: [...DEFAULT_DISTRACTING_APPS],
  distractingDomains: [],
  onboardingCompleted: false,
  customSceneGifs: cloneDefaultCustomSceneGifs(),
  lastViewedChangelogVersion: null,
};

export const createEmptyStats = (date: string): DailyStats => ({
  date,
  shown: {
    break: 0,
    water: 0,
    focusNudge: 0,
  },
  acknowledged: {
    break: 0,
    water: 0,
    focusNudge: 0,
  },
  distractedDurationSeconds: 0,
  focusDurationSeconds: 0,
  currentFocusStreakSeconds: 0,
});

export const createDefaultStore = (): StoreShape => ({
  version: STORE_VERSION,
  settings: {
    ...defaultSettings,
    distractingApps: [...defaultSettings.distractingApps],
    distractingDomains: [...defaultSettings.distractingDomains],
    petPosition: { ...defaultSettings.petPosition },
    customSceneGifs: cloneDefaultCustomSceneGifs(),
  },
  stats: {},
});

export const reminderCopy: Record<ReminderKind, string[]> = {
  break: [
    "该起来活动一下啦。",
    "伸个懒腰，走两步吧。",
    "小休息一下，我们再继续。",
  ],
  water: ["该喝口水啦。", "补充水分啦。", "水杯该见底了。"],
  focusNudge: ["先回到手头工作。", "我们把注意力拉回来。", "这会儿先别分心。"],
};
