import { describe, expect, test } from 'vitest'
import { createReminderScheduler } from '../src/shared/reminderScheduler'

describe('createReminderScheduler', () => {
  test('does not emit reminders immediately when scheduling starts', () => {
    const startedAt = 1_000_000
    const scheduler = createReminderScheduler(
      {
        breakIntervalMinutes: 50,
        waterIntervalMinutes: 30
      },
      startedAt
    )

    expect(scheduler.tick(startedAt)).toEqual([])
    expect(scheduler.tick(startedAt + 29 * 60 * 1000)).toEqual([])
    expect(scheduler.tick(startedAt + 30 * 60 * 1000)).toEqual(['water'])
    expect(scheduler.tick(startedAt + 49 * 60 * 1000)).toEqual([])
    expect(scheduler.tick(startedAt + 50 * 60 * 1000)).toEqual(['break'])
  })

  test('emits break and water reminders on their configured cadence', () => {
    const scheduler = createReminderScheduler(
      {
        breakIntervalMinutes: 50,
        waterIntervalMinutes: 30
      },
      0
    )

    expect(scheduler.tick(29 * 60 * 1000)).toEqual([])
    expect(scheduler.tick(30 * 60 * 1000)).toEqual(['water'])
    expect(scheduler.tick(50 * 60 * 1000)).toEqual(['break'])
    expect(scheduler.tick(60 * 60 * 1000)).toEqual(['water'])
    expect(scheduler.tick(100 * 60 * 1000)).toEqual(['water', 'break'])
  })
})
