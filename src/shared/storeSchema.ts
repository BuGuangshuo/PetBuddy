import { cloneDefaultCustomSceneGifs, createDefaultStore, defaultSettings } from './defaults'
import { normalizeDistractingDomains } from './distractingDomains'
import type {
  AppSettings,
  CustomSceneGifMap,
  DailyStats,
  PetAppearanceId,
  PetSceneKey,
  ReminderCounts,
  StoreShape
} from './types'

const PET_SCENE_KEYS: readonly PetSceneKey[] = [
  'default',
  'sit',
  'happy',
  'breakPrompt',
  'breakRunning',
  'breakDone',
  'hydrationPrompt',
  'drinking',
  'hydrationDone',
  'focusGuard',
  'focusAlert',
  'focusDone',
  'sad',
  'sleeping'
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isNonNegativeInteger = (value: unknown): value is number =>
  isFiniteNumber(value) && Number.isInteger(value) && value >= 0

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'

const PET_APPEARANCE_IDS: readonly PetAppearanceId[] = ['line-dog', 'golden-puppy']
const SUPPORTED_BROWSER_APP_KEYS = new Set([
  'com.apple.safari',
  'safari',
  'com.google.chrome',
  'google chrome',
  'company.thebrowser.browser',
  'arc',
  'com.microsoft.edgemac',
  'microsoft edge'
])

const isPetAppearanceId = (value: unknown): value is PetAppearanceId =>
  typeof value === 'string' && PET_APPEARANCE_IDS.includes(value as PetAppearanceId)

const isSupportedBrowserApp = (value: string): boolean =>
  SUPPORTED_BROWSER_APP_KEYS.has(value.trim().toLocaleLowerCase())

const sanitizeSceneGifAppearanceMap = (value: unknown): Partial<Record<PetSceneKey, string>> => {
  if (!isRecord(value)) {
    return {}
  }

  const sanitized: Partial<Record<PetSceneKey, string>> = {}

  for (const sceneKey of PET_SCENE_KEYS) {
    const sceneValue = value[sceneKey]
    if (typeof sceneValue === 'string') {
      sanitized[sceneKey] = sceneValue
    }
  }

  return sanitized
}

const isReminderCounts = (value: unknown): value is ReminderCounts =>
  isRecord(value) &&
  isNonNegativeInteger(value.break) &&
  isNonNegativeInteger(value.water) &&
  isNonNegativeInteger(value.focusNudge)

const isDailyStats = (value: unknown): value is DailyStats =>
  isRecord(value) &&
  typeof value.date === 'string' &&
  isReminderCounts(value.shown) &&
  isReminderCounts(value.acknowledged) &&
  isNonNegativeInteger(value.distractedDurationSeconds) &&
  isNonNegativeInteger(value.focusDurationSeconds) &&
  isNonNegativeInteger(value.currentFocusStreakSeconds)

const mergeCustomSceneGifs = (value: unknown): CustomSceneGifMap => {
  const defaults = cloneDefaultCustomSceneGifs()
  const customSceneGifs = isRecord(value) ? value : {}

  return {
    'line-dog': {
      ...defaults['line-dog'],
      ...sanitizeSceneGifAppearanceMap(customSceneGifs['line-dog'])
    },
    'golden-puppy': {
      ...defaults['golden-puppy'],
      ...sanitizeSceneGifAppearanceMap(customSceneGifs['golden-puppy'])
    }
  }
}

const mergeSettings = (value: unknown): AppSettings => {
  if (!value || typeof value !== 'object') {
    return {
      ...defaultSettings,
      distractingApps: [...defaultSettings.distractingApps],
      distractingDomains: [...defaultSettings.distractingDomains],
      petPosition: { ...defaultSettings.petPosition },
      customSceneGifs: mergeCustomSceneGifs(undefined)
    }
  }

  const persisted = value as Partial<AppSettings>
  const persistedPetPosition: Record<string, unknown> = isRecord(persisted.petPosition) ? persisted.petPosition : {}

  return {
    ...defaultSettings,
    breakIntervalMinutes: isNonNegativeInteger(persisted.breakIntervalMinutes)
      ? persisted.breakIntervalMinutes
      : defaultSettings.breakIntervalMinutes,
    breakRemindersMutedOnDate:
      typeof persisted.breakRemindersMutedOnDate === 'string' || persisted.breakRemindersMutedOnDate === null
        ? persisted.breakRemindersMutedOnDate
        : defaultSettings.breakRemindersMutedOnDate,
    waterIntervalMinutes: isNonNegativeInteger(persisted.waterIntervalMinutes)
      ? persisted.waterIntervalMinutes
      : defaultSettings.waterIntervalMinutes,
    focusSessionMinutes: isNonNegativeInteger(persisted.focusSessionMinutes)
      ? persisted.focusSessionMinutes
      : defaultSettings.focusSessionMinutes,
    focusModeEnabled: isBoolean(persisted.focusModeEnabled)
      ? persisted.focusModeEnabled
      : defaultSettings.focusModeEnabled,
    focusModePendingEnable: isBoolean(persisted.focusModePendingEnable)
      ? persisted.focusModePendingEnable
      : defaultSettings.focusModePendingEnable,
    focusGraceSeconds: isNonNegativeInteger(persisted.focusGraceSeconds)
      ? persisted.focusGraceSeconds
      : defaultSettings.focusGraceSeconds,
    launchAtLogin: isBoolean(persisted.launchAtLogin) ? persisted.launchAtLogin : defaultSettings.launchAtLogin,
    checkUpdatesOnStartup: isBoolean(persisted.checkUpdatesOnStartup)
      ? persisted.checkUpdatesOnStartup
      : defaultSettings.checkUpdatesOnStartup,
    selectedPetAppearance: isPetAppearanceId(persisted.selectedPetAppearance)
      ? persisted.selectedPetAppearance
      : defaultSettings.selectedPetAppearance,
    distractingApps: Array.isArray(persisted.distractingApps)
      ? persisted.distractingApps.filter(
          (app): app is string => typeof app === 'string' && !isSupportedBrowserApp(app)
        )
      : [...defaultSettings.distractingApps],
    distractingDomains: Array.isArray(persisted.distractingDomains)
      ? normalizeDistractingDomains(
          persisted.distractingDomains.filter((domain): domain is string => typeof domain === 'string')
        )
      : [...defaultSettings.distractingDomains],
    lastViewedChangelogVersion:
      typeof persisted.lastViewedChangelogVersion === 'string' || persisted.lastViewedChangelogVersion === null
        ? persisted.lastViewedChangelogVersion
        : defaultSettings.lastViewedChangelogVersion,
    onboardingCompleted: isBoolean(persisted.onboardingCompleted)
      ? persisted.onboardingCompleted
      : defaultSettings.onboardingCompleted,
    petPosition: {
      ...defaultSettings.petPosition,
      x: isFiniteNumber(persistedPetPosition.x) ? persistedPetPosition.x : defaultSettings.petPosition.x,
      y: isFiniteNumber(persistedPetPosition.y) ? persistedPetPosition.y : defaultSettings.petPosition.y
    },
    customSceneGifs: mergeCustomSceneGifs(persisted.customSceneGifs)
  }
}

const normalizeStats = (value: unknown): Record<string, DailyStats> => {
  if (!isRecord(value)) {
    return {}
  }

  return Object.entries(value).reduce<Record<string, DailyStats>>((stats, [key, entry]) => {
    if (isDailyStats(entry)) {
      stats[key] = entry
    }

    return stats
  }, {})
}

export const normalizeStoreShape = (value: unknown): StoreShape => {
  const defaults = createDefaultStore()
  if (!value || typeof value !== 'object') {
    return defaults
  }

  const raw = value as Partial<StoreShape>

  return {
    version: defaults.version,
    settings: mergeSettings(raw.settings),
    stats: normalizeStats(raw.stats)
  }
}
