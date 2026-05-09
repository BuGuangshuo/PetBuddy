import { describe, expect, test } from 'vitest'
import { stepFocusMonitor } from '../src/shared/focusSession'

describe('stepFocusMonitor', () => {
  test('treats supported browsers as distracting only when the sampled domain matches', () => {
    const baseState = {
      currentDistractingApp: null,
      distractingSince: null,
      totalDistractedSeconds: 0,
      currentFocusStreakSeconds: 45,
      shouldNudge: false
    }

    const matchingDomainState = stepFocusMonitor(
      baseState,
      { appId: 'com.apple.Safari', domain: 'm.youtube.com', timestamp: 5_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(matchingDomainState.currentDistractingApp).toBe('com.apple.Safari')
    expect(matchingDomainState.distractingSince).toBe(5_000)
    expect(matchingDomainState.totalDistractedSeconds).toBe(0)
    expect(matchingDomainState.currentFocusStreakSeconds).toBe(0)
    expect(matchingDomainState.shouldNudge).toBe(false)

    const nonMatchingDomainState = stepFocusMonitor(
      baseState,
      { appId: 'com.apple.Safari', domain: 'docs.example.com', timestamp: 5_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(nonMatchingDomainState.currentDistractingApp).toBeNull()
    expect(nonMatchingDomainState.distractingSince).toBeNull()
    expect(nonMatchingDomainState.totalDistractedSeconds).toBe(0)
    expect(nonMatchingDomainState.currentFocusStreakSeconds).toBe(45)
    expect(nonMatchingDomainState.shouldNudge).toBe(false)
  })

  test('keeps app-based distraction tracking for non-browser apps', () => {
    const state = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 45,
        shouldNudge: false
      },
      { appId: 'com.spotify.client', domain: 'youtube.com', timestamp: 5_000 },
      {
        distractingApps: ['com.spotify.client'],
        distractingDomains: [],
        focusGraceSeconds: 20
      }
    )

    expect(state.currentDistractingApp).toBe('com.spotify.client')
    expect(state.distractingSince).toBe(5_000)
    expect(state.totalDistractedSeconds).toBe(0)
    expect(state.currentFocusStreakSeconds).toBe(0)
    expect(state.shouldNudge).toBe(false)
  })

  test('treats supported browser samples without domain inputs as non-matching', () => {
    const missingDomainsOptionState = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 45,
        shouldNudge: false
      },
      { appId: 'com.apple.Safari', domain: 'youtube.com', timestamp: 5_000 },
      {
        distractingApps: ['com.apple.Safari'],
        focusGraceSeconds: 20
      }
    )

    expect(missingDomainsOptionState.currentDistractingApp).toBeNull()
    expect(missingDomainsOptionState.distractingSince).toBeNull()
    expect(missingDomainsOptionState.totalDistractedSeconds).toBe(0)
    expect(missingDomainsOptionState.currentFocusStreakSeconds).toBe(45)
    expect(missingDomainsOptionState.shouldNudge).toBe(false)

    const missingSampleDomainState = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 45,
        shouldNudge: false
      },
      { appId: 'com.apple.Safari', timestamp: 5_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(missingSampleDomainState.currentDistractingApp).toBeNull()
    expect(missingSampleDomainState.distractingSince).toBeNull()
    expect(missingSampleDomainState.totalDistractedSeconds).toBe(0)
    expect(missingSampleDomainState.currentFocusStreakSeconds).toBe(45)
    expect(missingSampleDomainState.shouldNudge).toBe(false)
  })

  test('nudges only after the grace period and resets when user returns to work', () => {
    let state = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 120,
        shouldNudge: false
      },
      { appId: 'com.apple.Safari', domain: 'youtube.com', timestamp: 0 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.shouldNudge).toBe(false)

    state = stepFocusMonitor(
      state,
      { appId: 'com.apple.Safari', domain: 'youtube.com', timestamp: 19_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.shouldNudge).toBe(false)

    state = stepFocusMonitor(
      state,
      { appId: 'com.apple.Safari', domain: 'youtube.com', timestamp: 21_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.shouldNudge).toBe(true)
    expect(state.totalDistractedSeconds).toBe(21)

    state = stepFocusMonitor(
      state,
      { appId: 'com.apple.dt.Xcode', domain: null, timestamp: 31_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.currentDistractingApp).toBeNull()
    expect(state.shouldNudge).toBe(false)
    expect(state.currentFocusStreakSeconds).toBe(10)
  })

  test('accepts domain-bearing browser samples when the domain matches', () => {
    const state = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 45,
        shouldNudge: false
      },
      { appId: 'com.apple.Safari', domain: 'youtube.com', timestamp: 5_000 },
      {
        distractingApps: ['com.apple.Safari'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.currentDistractingApp).toBe('com.apple.Safari')
    expect(state.distractingSince).toBe(5_000)
    expect(state.totalDistractedSeconds).toBe(0)
    expect(state.currentFocusStreakSeconds).toBe(0)
    expect(state.shouldNudge).toBe(false)
  })

  test('keeps the grace-period timer running when switching between distracting targets', () => {
    let state = stepFocusMonitor(
      {
        currentDistractingApp: null,
        distractingSince: null,
        totalDistractedSeconds: 0,
        currentFocusStreakSeconds: 90,
        shouldNudge: false
      },
      { appId: 'com.apple.Safari', domain: 'youtube.com', timestamp: 0 },
      {
        distractingApps: ['com.apple.Safari', 'com.spotify.client'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    state = stepFocusMonitor(
      state,
      { appId: 'com.spotify.client', domain: null, timestamp: 19_000 },
      {
        distractingApps: ['com.apple.Safari', 'com.spotify.client'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.currentDistractingApp).toBe('com.spotify.client')
    expect(state.distractingSince).toBe(0)
    expect(state.totalDistractedSeconds).toBe(19)
    expect(state.shouldNudge).toBe(false)

    state = stepFocusMonitor(
      state,
      { appId: 'com.spotify.client', domain: null, timestamp: 21_000 },
      {
        distractingApps: ['com.apple.Safari', 'com.spotify.client'],
        distractingDomains: ['youtube.com'],
        focusGraceSeconds: 20
      }
    )

    expect(state.distractingSince).toBe(0)
    expect(state.totalDistractedSeconds).toBe(21)
    expect(state.shouldNudge).toBe(true)
  })
})
