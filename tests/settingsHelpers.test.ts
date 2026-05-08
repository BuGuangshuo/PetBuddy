import { describe, expect, test } from 'vitest'
import { isReminderEnabled, nextReminderInterval } from '../src/renderer/src/settingsHelpers'

describe('settingsHelpers', () => {
  test('treats sentinel interval as disabled', () => {
    expect(isReminderEnabled(50)).toBe(true)
    expect(isReminderEnabled(9999)).toBe(false)
    expect(isReminderEnabled(0)).toBe(false)
  })

  test('maps toggle state to the expected interval values', () => {
    expect(nextReminderInterval(true, 50)).toBe(50)
    expect(nextReminderInterval(false, 50)).toBe(9999)
  })
})
