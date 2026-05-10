import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ReminderService } from '../src/main/services/reminderService'
import type { ReminderEvent } from '../src/shared/types'

describe('ReminderService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('snoozes break reminders for ten minutes and restarts the cadence after the break completes', () => {
    const shown: ReminderEvent[] = []
    const service = new ReminderService({
      getSettings: () => ({
        breakIntervalMinutes: 50,
        breakRemindersMutedOnDate: null,
        waterIntervalMinutes: 9999,
        focusSessionMinutes: 25,
        focusModeEnabled: false,
        focusModePendingEnable: false,
        focusGraceSeconds: 20,
        launchAtLogin: false,
        checkUpdatesOnStartup: false,
        selectedPetAppearance: 'line-dog',
        petPosition: { x: 48, y: 48 },
        distractingApps: [],
        distractingDomains: [],
        onboardingCompleted: false,
        customSceneGifs: {},
        lastViewedChangelogVersion: null
      }),
      onReminder: (event) => shown.push(event),
      onReminderFinished: () => undefined
    })

    service.start()

    vi.advanceTimersByTime(50 * 60 * 1000)
    expect(shown).toHaveLength(1)

    service.acknowledge(shown[0].id)
    service.snoozeBreak(10 * 60 * 1000)

    vi.advanceTimersByTime(9 * 60 * 1000 + 59 * 1000)
    expect(shown).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(shown).toHaveLength(2)

    service.acknowledge(shown[1].id)
    service.completeBreak()

    vi.advanceTimersByTime(49 * 60 * 1000 + 59 * 1000)
    expect(shown).toHaveLength(2)

    vi.advanceTimersByTime(1000)
    expect(shown).toHaveLength(3)

    service.stop()
  })

  test('suppresses break reminders for the rest of the muted day and resumes them the next day', () => {
    const shown: ReminderEvent[] = []
    vi.setSystemTime(new Date(2026, 4, 8, 9, 0, 0))
    const settings = {
      breakIntervalMinutes: 10,
      waterIntervalMinutes: 9999,
      focusSessionMinutes: 25,
      focusModeEnabled: false,
      focusModePendingEnable: false,
      focusGraceSeconds: 20,
      launchAtLogin: false,
      checkUpdatesOnStartup: false,
      selectedPetAppearance: 'line-dog' as const,
      petPosition: { x: 48, y: 48 },
      distractingApps: [],
      distractingDomains: [],
      onboardingCompleted: false,
      customSceneGifs: {},
      lastViewedChangelogVersion: null,
      breakRemindersMutedOnDate: null as string | null
    }
    const service = new ReminderService({
      getSettings: () => settings,
      onReminder: (event) => shown.push(event),
      onReminderFinished: () => undefined
    })
    service.start()

    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(shown).toHaveLength(1)

    service.acknowledge(shown[0].id)
    settings.breakRemindersMutedOnDate = '2026-05-08'

    vi.advanceTimersByTime(14 * 60 * 60 * 1000 + 49 * 60 * 1000)
    expect(shown).toHaveLength(1)

    vi.advanceTimersByTime(60 * 1000)
    expect(shown).toHaveLength(2)

    service.stop()
  })

  test('resets the break cadence when a manual break starts before the next reminder is due', () => {
    const shown: ReminderEvent[] = []
    const service = new ReminderService({
      getSettings: () => ({
        breakIntervalMinutes: 50,
        breakRemindersMutedOnDate: null,
        waterIntervalMinutes: 9999,
        focusSessionMinutes: 25,
        focusModeEnabled: false,
        focusModePendingEnable: false,
        focusGraceSeconds: 20,
        launchAtLogin: false,
        checkUpdatesOnStartup: false,
        selectedPetAppearance: 'line-dog',
        petPosition: { x: 48, y: 48 },
        distractingApps: [],
        distractingDomains: [],
        onboardingCompleted: false,
        customSceneGifs: {},
        lastViewedChangelogVersion: null
      }),
      onReminder: (event) => shown.push(event),
      onReminderFinished: () => undefined
    })

    service.start()

    vi.advanceTimersByTime(49 * 60 * 1000)
    service.completeBreak()

    vi.advanceTimersByTime(60 * 1000)
    expect(shown).toHaveLength(0)

    vi.advanceTimersByTime(49 * 60 * 1000)
    expect(shown).toHaveLength(1)

    service.stop()
  })

  test('keeps focus nudges visible until acknowledged and lets higher-priority breaks preempt them', () => {
    const shown: ReminderEvent[] = []
    const finished: ReminderEvent[] = []
    const service = new ReminderService({
      getSettings: () => ({
        breakIntervalMinutes: 50,
        breakRemindersMutedOnDate: null,
        waterIntervalMinutes: 9999,
        focusSessionMinutes: 25,
        focusModeEnabled: false,
        focusModePendingEnable: false,
        focusGraceSeconds: 20,
        launchAtLogin: false,
        checkUpdatesOnStartup: false,
        selectedPetAppearance: 'line-dog',
        petPosition: { x: 48, y: 48 },
        distractingApps: [],
        distractingDomains: [],
        onboardingCompleted: false,
        customSceneGifs: {},
        lastViewedChangelogVersion: null
      }),
      onReminder: (event) => shown.push(event),
      onReminderFinished: (event) => finished.push(event)
    })

    service.start()

    service.enqueue('focusNudge')
    vi.advanceTimersByTime(1000)

    expect(shown).toHaveLength(1)
    expect(shown[0].kind).toBe('focusNudge')

    vi.advanceTimersByTime(10_000)
    expect(finished).toHaveLength(0)

    service.enqueue('break')
    vi.advanceTimersByTime(1000)

    expect(shown).toHaveLength(2)
    expect(shown[1].kind).toBe('break')

    service.acknowledge(shown[1].id)
    expect(finished.map((event) => event.kind)).toEqual(['break'])

    service.stop()
  })

  test('can clear queued and active focus nudges before they surface again', () => {
    const shown: ReminderEvent[] = []
    const finished: ReminderEvent[] = []
    const service = new ReminderService({
      getSettings: () => ({
        breakIntervalMinutes: 50,
        breakRemindersMutedOnDate: null,
        waterIntervalMinutes: 9999,
        focusSessionMinutes: 25,
        focusModeEnabled: false,
        focusModePendingEnable: false,
        focusGraceSeconds: 20,
        launchAtLogin: false,
        checkUpdatesOnStartup: false,
        selectedPetAppearance: 'line-dog',
        petPosition: { x: 48, y: 48 },
        distractingApps: [],
        distractingDomains: [],
        onboardingCompleted: false,
        customSceneGifs: {},
        lastViewedChangelogVersion: null
      }),
      onReminder: (event) => shown.push(event),
      onReminderFinished: (event) => finished.push(event)
    })

    service.start()

    service.enqueue('focusNudge')
    vi.advanceTimersByTime(1000)
    expect(shown.map((event) => event.kind)).toEqual(['focusNudge'])

    service.enqueue('break')
    service.clearByKind('focusNudge')
    vi.advanceTimersByTime(1000)

    expect(shown.map((event) => event.kind)).toEqual(['focusNudge', 'break'])

    service.acknowledge(shown[1].id)
    expect(finished.map((event) => event.kind)).toEqual(['break'])

    service.stop()
  })
})
