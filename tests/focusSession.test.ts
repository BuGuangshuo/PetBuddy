import { describe, expect, test } from 'vitest'
import { stepFocusMonitor } from '../src/shared/focusSession'

describe('stepFocusMonitor', () => {
  test('nudges only after the grace period and resets when user returns to work', () => {
    let state = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 120,
        shouldNudge: false
      },
      { appId: 'com.apple.Safari', timestamp: 0 },
      {
        distractingApps: ['com.apple.Safari'],
        focusGraceSeconds: 20
      }
    )

    expect(state.shouldNudge).toBe(false)

    state = stepFocusMonitor(
      state,
      { appId: 'com.apple.Safari', timestamp: 19_000 },
      {
        distractingApps: ['com.apple.Safari'],
        focusGraceSeconds: 20
      }
    )

    expect(state.shouldNudge).toBe(false)

    state = stepFocusMonitor(
      state,
      { appId: 'com.apple.Safari', timestamp: 21_000 },
      {
        distractingApps: ['com.apple.Safari'],
        focusGraceSeconds: 20
      }
    )

    expect(state.shouldNudge).toBe(true)
    expect(state.totalDistractedSeconds).toBe(21)

    state = stepFocusMonitor(
      state,
      { appId: 'com.apple.dt.Xcode', timestamp: 31_000 },
      {
        distractingApps: ['com.apple.Safari'],
        focusGraceSeconds: 20
      }
    )

    expect(state.currentDistractingApp).toBeNull()
    expect(state.shouldNudge).toBe(false)
    expect(state.currentFocusStreakSeconds).toBe(10)
  })
})
