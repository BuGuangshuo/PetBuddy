import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { FocusMonitorService, getFrontmostSample } from '../src/main/services/focusMonitor'

const createSettings = (
  focusModeEnabled = true,
  overrides: Partial<ReturnType<typeof createSettingsBase>> = {}
) => ({
  ...createSettingsBase(focusModeEnabled),
  ...overrides
})

const createSettingsBase = (focusModeEnabled: boolean) => ({
  breakIntervalMinutes: 50,
  breakRemindersMutedOnDate: null,
  waterIntervalMinutes: 45,
  focusSessionMinutes: 25,
  focusModeEnabled,
  focusModePendingEnable: false,
  focusGraceSeconds: 20,
  launchAtLogin: false,
  checkUpdatesOnStartup: false,
  selectedPetAppearance: 'line-dog' as const,
  petPosition: { x: 48, y: 48 },
  distractingApps: ['com.spotify.client'],
  distractingDomains: ['youtube.com'],
  onboardingCompleted: true,
  customSceneGifs: {},
  lastViewedChangelogVersion: null
})

describe('FocusMonitorService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('reads a normalized domain from Safari frontmost samples', async () => {
    const runAppleScript = vi
      .fn<(_: string) => Promise<string | null>>()
      .mockResolvedValueOnce('com.apple.Safari')
      .mockResolvedValueOnce('https://www.youtube.com/watch?v=1')

    await expect(getFrontmostSample({ platform: 'darwin', runAppleScript })).resolves.toEqual({
      appId: 'com.apple.Safari',
      domain: 'youtube.com'
    })
    expect(runAppleScript).toHaveBeenCalledTimes(2)
    expect(runAppleScript.mock.calls[1]?.[0]).toContain('tell application "Safari"')
  })

  test('maps fallback browser app names to bundle ids before reading the URL', async () => {
    const runAppleScript = vi
      .fn<(_: string) => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('Safari')
      .mockResolvedValueOnce('https://www.youtube.com/watch?v=1')

    await expect(getFrontmostSample({ platform: 'darwin', runAppleScript })).resolves.toEqual({
      appId: 'com.apple.Safari',
      domain: 'youtube.com'
    })
    expect(runAppleScript).toHaveBeenCalledTimes(3)
    expect(runAppleScript.mock.calls[2]?.[0]).toContain('tell application "Safari"')
  })

  test('maps fallback non-browser app names to bundle ids', async () => {
    const runAppleScript = vi
      .fn<(_: string) => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('Spotify')
      .mockResolvedValueOnce('com.spotify.client')

    await expect(getFrontmostSample({ platform: 'darwin', runAppleScript })).resolves.toEqual({
      appId: 'com.spotify.client',
      domain: null
    })
    expect(runAppleScript).toHaveBeenCalledTimes(3)
    expect(runAppleScript.mock.calls[2]?.[0]).toContain('id of application "Spotify"')
  })

  test('returns a browser sample with null domain when URL lookup fails', async () => {
    const runAppleScript = vi
      .fn<(_: string) => Promise<string | null>>()
      .mockResolvedValueOnce('com.google.Chrome')
      .mockRejectedValueOnce(new Error('AppleScript failed'))

    await expect(getFrontmostSample({ platform: 'darwin', runAppleScript })).resolves.toEqual({
      appId: 'com.google.Chrome',
      domain: null
    })
    expect(runAppleScript).toHaveBeenCalledTimes(2)
    expect(runAppleScript.mock.calls[1]?.[0]).toContain('active tab')
  })

  test('skips browser URL lookup for non-browser apps', async () => {
    const runAppleScript = vi.fn<(_: string) => Promise<string | null>>().mockResolvedValueOnce('com.spotify.client')

    await expect(getFrontmostSample({ platform: 'darwin', runAppleScript })).resolves.toEqual({
      appId: 'com.spotify.client',
      domain: null
    })
    expect(runAppleScript).toHaveBeenCalledTimes(1)
  })

  test('does not nudge after focus mode is turned off before the app sample resolves', async () => {
    let focusModeEnabled = true
    let shouldMonitor = true
    let resolveFrontmostSample: ((sample: { appId: string | null; domain: string | null }) => void) | undefined
    const onNudge = vi.fn()
    const onDistractedDelta = vi.fn()
    const onFocusStreak = vi.fn()

    const service = new FocusMonitorService({
      getSettings: () => createSettings(focusModeEnabled),
      shouldMonitor: () => shouldMonitor,
      hasPermission: () => true,
      onDistractedDelta,
      onFocusStreak,
      onNudge,
      getFrontmostSample: () =>
        new Promise((resolve) => {
          resolveFrontmostSample = resolve as (sample: { appId: string | null; domain: string | null }) => void
        })
    })

    service.start()
    await vi.advanceTimersByTimeAsync(5000)

    focusModeEnabled = false
    if (resolveFrontmostSample) {
      resolveFrontmostSample({ appId: 'com.apple.Safari', domain: 'youtube.com' })
    }
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)

    expect(onNudge).not.toHaveBeenCalled()
    expect(onDistractedDelta).not.toHaveBeenCalled()
    expect(onFocusStreak).not.toHaveBeenCalled()

    service.stop()
  })

  test('does not nudge when focus detection is enabled but no focus session is active', async () => {
    const onNudge = vi.fn()
    const onDistractedDelta = vi.fn()
    const onFocusStreak = vi.fn()

    const service = new FocusMonitorService({
      getSettings: () => createSettings(true),
      shouldMonitor: () => false,
      hasPermission: () => true,
      onDistractedDelta,
      onFocusStreak,
      onNudge,
      getFrontmostSample: async () => ({ appId: 'com.apple.Safari', domain: 'youtube.com' })
    })

    service.start()
    await vi.advanceTimersByTimeAsync(20_000)

    expect(onNudge).not.toHaveBeenCalled()
    expect(onDistractedDelta).not.toHaveBeenCalled()
    expect(onFocusStreak).not.toHaveBeenCalled()

    service.stop()
  })

  test('ignores stale poll completions after stop and after a subsequent start', async () => {
    let resolveFirstPoll: ((sample: { appId: string | null; domain: string | null }) => void) | undefined
    let resolveSecondPoll: ((sample: { appId: string | null; domain: string | null }) => void) | undefined
    const onNudge = vi.fn()
    const onDistractedDelta = vi.fn()
    const onFocusStreak = vi.fn()
    let pollCount = 0

    const service = new FocusMonitorService({
      getSettings: () => createSettings(true, { focusGraceSeconds: 0 }),
      shouldMonitor: () => true,
      hasPermission: () => true,
      onDistractedDelta,
      onFocusStreak,
      onNudge,
      getFrontmostSample: () =>
        new Promise((resolve) => {
          pollCount += 1
          if (pollCount === 1) {
            resolveFirstPoll = resolve
            return
          }

          resolveSecondPoll = resolve
        })
    })

    service.start()
    await vi.advanceTimersByTimeAsync(5000)
    service.stop()
    service.start()
    await vi.advanceTimersByTimeAsync(5000)

    resolveFirstPoll?.({ appId: 'com.apple.Safari', domain: 'youtube.com' })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)

    expect(onNudge).not.toHaveBeenCalled()
    expect(onDistractedDelta).not.toHaveBeenCalled()
    expect(onFocusStreak).not.toHaveBeenCalled()

    resolveSecondPoll?.({ appId: 'com.apple.Safari', domain: 'youtube.com' })
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(0)

    expect(onNudge).toHaveBeenCalledTimes(1)
    expect(onDistractedDelta).not.toHaveBeenCalled()
    expect(onFocusStreak).toHaveBeenCalledWith(0)

    service.stop()
  })

  test('swallows rejected sample reads and continues polling', async () => {
    const onNudge = vi.fn()
    const onDistractedDelta = vi.fn()
    const onFocusStreak = vi.fn()
    const getFrontmostSample = vi
      .fn<() => Promise<{ appId: string | null; domain: string | null }>>()
      .mockRejectedValueOnce(new Error('sample failed'))
      .mockResolvedValueOnce({ appId: 'com.apple.Safari', domain: 'youtube.com' })

    const service = new FocusMonitorService({
      getSettings: () => createSettings(true, { focusGraceSeconds: 0 }),
      shouldMonitor: () => true,
      hasPermission: () => true,
      onDistractedDelta,
      onFocusStreak,
      onNudge,
      getFrontmostSample
    })

    service.start()
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)

    expect(getFrontmostSample).toHaveBeenCalledTimes(2)
    expect(onNudge).toHaveBeenCalledTimes(1)
    expect(onFocusStreak).toHaveBeenCalledWith(0)

    service.stop()
  })
})
