import { describe, expect, test } from 'vitest'
import {
  createFocusSession,
  getElapsedFocusSessionSeconds,
  getFocusSessionRemainingSeconds,
  getFocusSessionStatus,
  isFocusSessionActive
} from '../src/shared/focusSession'

describe('focus session timer', () => {
  test('creates an active session using the configured minutes', () => {
    const session = createFocusSession(1_000, 25)

    expect(session).toEqual({
      startedAt: 1_000,
      endsAt: 1_501_000
    })
    expect(isFocusSessionActive(session, 1_000)).toBe(true)
    expect(getFocusSessionRemainingSeconds(session, 1_000)).toBe(1500)
  })

  test('reports remaining seconds until the session ends', () => {
    const session = createFocusSession(10_000, 1)

    expect(getFocusSessionRemainingSeconds(session, 10_000)).toBe(60)
    expect(getFocusSessionRemainingSeconds(session, 39_500)).toBe(31)
    expect(getFocusSessionRemainingSeconds(session, 70_000)).toBe(0)
  })

  test('treats the session as inactive after its deadline', () => {
    const session = createFocusSession(100, 1)

    expect(isFocusSessionActive(session, 60_099)).toBe(true)
    expect(isFocusSessionActive(session, 60_100)).toBe(false)
    expect(getFocusSessionStatus(session, 60_100)).toBe('done')
  })

  test('returns idle when there is no focus session', () => {
    expect(getFocusSessionStatus(null, Date.now())).toBe('idle')
    expect(getFocusSessionRemainingSeconds(null, Date.now())).toBe(0)
    expect(isFocusSessionActive(null, Date.now())).toBe(false)
  })

  test('reports actual elapsed focus seconds and caps at the session deadline', () => {
    const session = createFocusSession(10_000, 1)

    expect(getElapsedFocusSessionSeconds(session, 10_000)).toBe(0)
    expect(getElapsedFocusSessionSeconds(session, 39_500)).toBe(29)
    expect(getElapsedFocusSessionSeconds(session, 80_000)).toBe(60)
    expect(getElapsedFocusSessionSeconds(null, 80_000)).toBe(0)
  })
})
