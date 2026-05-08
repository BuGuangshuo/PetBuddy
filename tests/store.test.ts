import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const backingState = new Map<string, unknown>()

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0'
  }
}))

vi.mock('electron-store', () => ({
  default: class StoreMock<T extends Record<string, unknown>> {
    constructor(options?: { defaults?: T }) {
      backingState.clear()
      if (options?.defaults) {
        for (const [key, value] of Object.entries(options.defaults)) {
          backingState.set(key, structuredClone(value))
        }
      }
    }

    get<K extends keyof T>(key: K, fallback?: T[K]): T[K] {
      return (backingState.get(key as string) as T[K] | undefined) ?? (fallback as T[K])
    }

    set<K extends keyof T>(key: K, value: T[K]): void {
      backingState.set(key as string, structuredClone(value))
    }
  }
}))

import { PetBuddyStore } from '../src/main/services/store'

describe('PetBuddyStore custom scene gifs', () => {
  beforeEach(() => {
    backingState.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('stores a custom scene gif path for an appearance', () => {
    const store = new PetBuddyStore()

    store.setCustomSceneGif('line-dog', 'default', '/tmp/default.gif')

    expect(store.getSettings().customSceneGifs['line-dog']?.default).toBe('/tmp/default.gif')
  })

  test('clears a custom scene gif path for an appearance', () => {
    const store = new PetBuddyStore()

    store.setCustomSceneGif('line-dog', 'default', '/tmp/default.gif')
    store.clearCustomSceneGif('line-dog', 'default')

    expect(store.getSettings().customSceneGifs['line-dog']?.default).toBeUndefined()
  })

  test('uses the local calendar day for stats keys instead of the UTC ISO date', () => {
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-05-06T16:30:00.000Z')
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026)
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(4)
    vi.spyOn(Date.prototype, 'getDate').mockReturnValue(7)

    const store = new PetBuddyStore()

    expect(store.getTodayStats().date).toBe('2026-05-07')
    expect(store.markReminderShown('break').date).toBe('2026-05-07')
  })

  test('clamps recent stats lookups to a sensible positive day count', () => {
    vi.useFakeTimers()
    const store = new PetBuddyStore()

    vi.setSystemTime(new Date(2026, 4, 1, 12))
    store.markReminderShown('break')
    vi.setSystemTime(new Date(2026, 4, 2, 12))
    store.markReminderShown('water')
    vi.setSystemTime(new Date(2026, 4, 3, 12))
    store.markReminderShown('focusNudge')

    expect(store.getRecentStats(2).map((entry) => entry.date)).toEqual(['2026-05-02', '2026-05-03'])
    expect(store.getRecentStats(0).map((entry) => entry.date)).toEqual(['2026-05-03'])
    expect(store.getRecentStats(-5).map((entry) => entry.date)).toEqual(['2026-05-03'])
    expect(store.getRecentStats(Number.NaN).map((entry) => entry.date)).toEqual(['2026-05-03'])
    expect(store.getRecentStats(Number.POSITIVE_INFINITY).map((entry) => entry.date)).toEqual(['2026-05-03'])
  })

  test('accumulates completed focus duration separately from the current focus streak', () => {
    const store = new PetBuddyStore()

    store.addFocusDurationSeconds(600)
    store.setFocusStreak(120)

    expect(store.getTodayStats().focusDurationSeconds).toBe(600)
    expect(store.getTodayStats().currentFocusStreakSeconds).toBe(120)
  })

  test('mutes break reminders for the current local day only', () => {
    vi.useFakeTimers()
    const store = new PetBuddyStore()

    vi.setSystemTime(new Date(2026, 4, 8, 12))
    store.muteBreakRemindersForToday()

    expect(store.areBreakRemindersMutedToday()).toBe(true)
    expect(store.getSettings().breakRemindersMutedOnDate).toBe('2026-05-08')

    vi.setSystemTime(new Date(2026, 4, 9, 12))
    expect(store.areBreakRemindersMutedToday()).toBe(false)
  })

  test('clears the break reminder mute when break reminder settings change', () => {
    vi.useFakeTimers()
    const store = new PetBuddyStore()

    vi.setSystemTime(new Date(2026, 4, 8, 12))
    store.muteBreakRemindersForToday()
    expect(store.areBreakRemindersMutedToday()).toBe(true)

    store.updateSettings({ breakIntervalMinutes: 60 })
    expect(store.areBreakRemindersMutedToday()).toBe(false)

    store.muteBreakRemindersForToday()
    expect(store.areBreakRemindersMutedToday()).toBe(true)

    store.updateSettings({ waterIntervalMinutes: 45 })
    expect(store.areBreakRemindersMutedToday()).toBe(true)
  })
})
