import type { FocusMonitorState, FocusSample, FocusSession, FocusSessionStatus } from './types'

interface FocusOptions {
  distractingApps: string[]
  focusGraceSeconds: number
}

export const createInitialFocusState = (): FocusMonitorState => ({
  currentDistractingApp: null,
  distractingSince: null,
  totalDistractedSeconds: 0,
  currentFocusStreakSeconds: 0,
  shouldNudge: false
})

export const createFocusSession = (now: number, minutes: number): FocusSession => ({
  startedAt: now,
  endsAt: now + Math.max(0, minutes) * 60 * 1000
})

export const getFocusSessionRemainingSeconds = (session: FocusSession | null, now: number): number => {
  if (!session) {
    return 0
  }

  return Math.max(0, Math.ceil((session.endsAt - now) / 1000))
}

export const getElapsedFocusSessionSeconds = (session: FocusSession | null, now: number): number => {
  if (!session) {
    return 0
  }

  return Math.max(0, Math.floor((Math.min(now, session.endsAt) - session.startedAt) / 1000))
}

export const isFocusSessionActive = (session: FocusSession | null, now: number): boolean =>
  session !== null && now < session.endsAt

export const getFocusSessionStatus = (session: FocusSession | null, now: number): FocusSessionStatus => {
  if (!session) {
    return 'idle'
  }

  return isFocusSessionActive(session, now) ? 'active' : 'done'
}

export const stepFocusMonitor = (
  previous: FocusMonitorState,
  sample: FocusSample,
  options: FocusOptions
): FocusMonitorState => {
  const isDistracting = sample.appId !== null && options.distractingApps.includes(sample.appId)

  if (!isDistracting) {
    const focusStart = previous.currentDistractingApp
      ? (previous.distractingSince ?? sample.timestamp) + previous.totalDistractedSeconds * 1000
      : sample.timestamp - previous.currentFocusStreakSeconds * 1000
    return {
      currentDistractingApp: null,
      distractingSince: null,
      totalDistractedSeconds: previous.totalDistractedSeconds,
      currentFocusStreakSeconds: Math.max(0, Math.floor((sample.timestamp - focusStart) / 1000)),
      shouldNudge: false
    }
  }

  const distractingSince =
    previous.currentDistractingApp === sample.appId && previous.distractingSince !== null
      ? previous.distractingSince
      : sample.timestamp

  const distractedSeconds = Math.floor((sample.timestamp - distractingSince) / 1000)

  return {
    currentDistractingApp: sample.appId,
    distractingSince,
    totalDistractedSeconds: distractedSeconds,
    currentFocusStreakSeconds: 0,
    shouldNudge: distractedSeconds >= options.focusGraceSeconds
  }
}
