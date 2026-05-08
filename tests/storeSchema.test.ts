import { describe, expect, test } from 'vitest'
import { cloneDefaultCustomSceneGifs, createDefaultStore, defaultSettings } from '../src/shared/defaults'
import { normalizeStoreShape } from '../src/shared/storeSchema'
import type { CustomSceneGifMap, DailyStats } from '../src/shared/types'

describe('normalizeStoreShape', () => {
  test('clones distractingApps for default and normalized stores', () => {
    const defaultStore = createDefaultStore()
    const normalizedStore = normalizeStoreShape(undefined)

    defaultStore.settings.distractingApps.push('Mutated App')

    expect(defaultStore.settings.distractingApps).not.toBe(defaultSettings.distractingApps)
    expect(normalizedStore.settings.distractingApps).not.toBe(defaultSettings.distractingApps)
    expect(normalizedStore.settings.distractingApps).not.toBe(defaultStore.settings.distractingApps)
    expect(defaultSettings.distractingApps).not.toContain('Mutated App')
    expect(normalizedStore.settings.distractingApps).not.toContain('Mutated App')
  })

  test('loads defaults and preserves existing values when migrating', () => {
    const store = normalizeStoreShape({
      version: 0,
      settings: {
        breakIntervalMinutes: 42,
        selectedPetAppearance: 'golden-puppy'
      }
    })

    expect(store.version).toBe(createDefaultStore().version)
    expect(store.settings.breakIntervalMinutes).toBe(42)
    expect(store.settings.selectedPetAppearance).toBe('golden-puppy')
    expect(store.settings.waterIntervalMinutes).toBe(defaultSettings.waterIntervalMinutes)
    expect(store.settings.focusSessionMinutes).toBe(defaultSettings.focusSessionMinutes)
    expect(store.stats).toEqual({})
  })

  test('preserves existing customSceneGifs and defaults missing appearance maps', () => {
    const store = normalizeStoreShape({
      version: 0,
      settings: {
        customSceneGifs: {
          'line-dog': {
            happy: '/tmp/line-dog-happy.gif'
          }
        }
      }
    })

    expect(store.settings.customSceneGifs).toEqual({
      'line-dog': {
        happy: '/tmp/line-dog-happy.gif'
      },
      'golden-puppy': {}
    })
  })

  test('adds missing nested scene maps for partially migrated stores', () => {
    const store = normalizeStoreShape({
      version: 0,
      settings: {
        customSceneGifs: {
          'golden-puppy': {
            sleeping: '/tmp/golden-puppy-sleeping.gif'
          }
        }
      }
    })

    expect(store.settings.customSceneGifs).toEqual({
      'line-dog': {},
      'golden-puppy': {
        sleeping: '/tmp/golden-puppy-sleeping.gif'
      }
    })
  })

  test('accepts partial appearance maps and still normalizes missing appearances', () => {
    const customSceneGifs: CustomSceneGifMap = {
      'line-dog': {
        happy: '/tmp/line-dog-happy.gif'
      },
      'golden-puppy': {}
    }

    const store = normalizeStoreShape({
      version: 0,
      settings: {
        customSceneGifs
      }
    })

    expect(store.settings.customSceneGifs).toEqual({
      'line-dog': {
        happy: '/tmp/line-dog-happy.gif'
      },
      'golden-puppy': {}
    })
  })

  test('drops malformed nested custom scene gif values and invalid stats entries', () => {
    const validStats: DailyStats = {
      date: '2026-05-07',
      shown: { break: 1, water: 2, focusNudge: 3 },
      acknowledged: { break: 0, water: 1, focusNudge: 1 },
      distractedDurationSeconds: 15,
      focusDurationSeconds: 1800,
      currentFocusStreakSeconds: 45
    }

    const store = normalizeStoreShape({
      version: 0,
      settings: {
        customSceneGifs: {
          'line-dog': 'not-a-map',
          'golden-puppy': {
            happy: '/tmp/golden-puppy-happy.gif',
            sleeping: 123,
            focusAlert: null
          }
        }
      },
      stats: {
        good: validStats,
        badArray: [],
        badString: 'oops',
        badShape: {
          date: '2026-05-07',
          shown: [],
          acknowledged: { break: 0, water: 0, focusNudge: 0 },
          distractedDurationSeconds: 0,
          focusDurationSeconds: 0,
          currentFocusStreakSeconds: 0
        }
      }
    })

    expect(store.settings.customSceneGifs).toEqual({
      'line-dog': {},
      'golden-puppy': {
        happy: '/tmp/golden-puppy-happy.gif'
      }
    })
    expect(store.stats).toEqual({
      good: validStats
    })
  })

  test('falls back to defaults for malformed persisted scalar settings', () => {
    const store = normalizeStoreShape({
      version: 0,
      settings: {
        breakIntervalMinutes: '42',
        waterIntervalMinutes: false,
        focusSessionMinutes: '25',
        focusModeEnabled: 'true',
        focusGraceSeconds: {},
        launchAtLogin: 1,
        checkUpdatesOnStartup: 'no',
        selectedPetAppearance: 'unknown-pet',
        onboardingCompleted: 'done'
      }
    })

    expect(store.settings.breakIntervalMinutes).toBe(defaultSettings.breakIntervalMinutes)
    expect(store.settings.waterIntervalMinutes).toBe(defaultSettings.waterIntervalMinutes)
    expect(store.settings.focusSessionMinutes).toBe(defaultSettings.focusSessionMinutes)
    expect(store.settings.focusModeEnabled).toBe(defaultSettings.focusModeEnabled)
    expect(store.settings.focusGraceSeconds).toBe(defaultSettings.focusGraceSeconds)
    expect(store.settings.launchAtLogin).toBe(defaultSettings.launchAtLogin)
    expect(store.settings.checkUpdatesOnStartup).toBe(defaultSettings.checkUpdatesOnStartup)
    expect(store.settings.selectedPetAppearance).toBe(defaultSettings.selectedPetAppearance)
    expect(store.settings.onboardingCompleted).toBe(defaultSettings.onboardingCompleted)
  })

  test('falls back to defaults for negative or fractional persisted interval settings', () => {
    const store = normalizeStoreShape({
      version: 0,
      settings: {
        breakIntervalMinutes: -5,
        waterIntervalMinutes: 22.5,
        focusSessionMinutes: -25,
        focusGraceSeconds: -0.25
      }
    })

    expect(store.settings.breakIntervalMinutes).toBe(defaultSettings.breakIntervalMinutes)
    expect(store.settings.waterIntervalMinutes).toBe(defaultSettings.waterIntervalMinutes)
    expect(store.settings.focusSessionMinutes).toBe(defaultSettings.focusSessionMinutes)
    expect(store.settings.focusGraceSeconds).toBe(defaultSettings.focusGraceSeconds)
  })

  test('clones distractingApps when settings falls back from null', () => {
    const store = normalizeStoreShape({
      version: 0,
      settings: null
    })

    expect(store.settings.distractingApps).toEqual(defaultSettings.distractingApps)
    expect(store.settings.distractingApps).not.toBe(defaultSettings.distractingApps)

    store.settings.distractingApps.push('Mutated App')

    expect(defaultSettings.distractingApps).not.toContain('Mutated App')
  })

  test('rejects malformed numeric stats values including NaN and Infinity', () => {
    const validStats: DailyStats = {
      date: '2026-05-07',
      shown: { break: 1, water: 2, focusNudge: 3 },
      acknowledged: { break: 0, water: 1, focusNudge: 1 },
      distractedDurationSeconds: 15,
      focusDurationSeconds: 1800,
      currentFocusStreakSeconds: 45
    }

    const store = normalizeStoreShape({
      version: 0,
      stats: {
        good: validStats,
        nanDuration: {
          ...validStats,
          distractedDurationSeconds: Number.NaN
        },
        infiniteStreak: {
          ...validStats,
          currentFocusStreakSeconds: Number.POSITIVE_INFINITY
        }
      }
    })

    expect(store.stats).toEqual({
      good: validStats
    })
  })

  test('rejects stats entries with negative or fractional persisted counts and durations', () => {
    const validStats: DailyStats = {
      date: '2026-05-07',
      shown: { break: 1, water: 2, focusNudge: 3 },
      acknowledged: { break: 0, water: 1, focusNudge: 1 },
      distractedDurationSeconds: 15,
      focusDurationSeconds: 1800,
      currentFocusStreakSeconds: 45
    }

    const store = normalizeStoreShape({
      version: 0,
      stats: {
        good: validStats,
        negativeShownBreak: {
          ...validStats,
          shown: { ...validStats.shown, break: -1 }
        },
        fractionalAcknowledgedWater: {
          ...validStats,
          acknowledged: { ...validStats.acknowledged, water: 0.5 }
        },
        negativeDistractedDuration: {
          ...validStats,
          distractedDurationSeconds: -30
        },
        negativeFocusDuration: {
          ...validStats,
          focusDurationSeconds: -10
        },
        fractionalFocusStreak: {
          ...validStats,
          currentFocusStreakSeconds: 12.75
        }
      }
    })

    expect(store.stats).toEqual({
      good: validStats
    })
  })

  test('keeps later custom scene gif defaults isolated from earlier mutations', () => {
    defaultSettings.customSceneGifs['line-dog']!.happy = '/tmp/default-settings.gif'

    const clonedDefaults = cloneDefaultCustomSceneGifs()
    const defaultStore = createDefaultStore()
    const normalizedStore = normalizeStoreShape(undefined)

    expect(clonedDefaults).toEqual({
      'line-dog': {},
      'golden-puppy': {}
    })
    expect(defaultStore.settings.customSceneGifs).toEqual(clonedDefaults)
    expect(normalizedStore.settings.customSceneGifs).toEqual(clonedDefaults)
  })
})
