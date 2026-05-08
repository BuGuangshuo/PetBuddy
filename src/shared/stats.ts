import type { DailyStats, ReminderKind } from './types'

type StatsEvent =
  | { type: 'shown'; kind: ReminderKind }
  | { type: 'acknowledged'; kind: ReminderKind }
  | { type: 'distracted'; seconds: number }
  | { type: 'focus-duration'; seconds: number }
  | { type: 'focus-streak'; seconds: number }

export const applyStatsEvent = (stats: DailyStats, event: StatsEvent): DailyStats => {
  if (event.type === 'shown') {
    return {
      ...stats,
      shown: {
        ...stats.shown,
        [event.kind]: stats.shown[event.kind] + 1
      }
    }
  }

  if (event.type === 'acknowledged') {
    return {
      ...stats,
      acknowledged: {
        ...stats.acknowledged,
        [event.kind]: stats.acknowledged[event.kind] + 1
      }
    }
  }

  if (event.type === 'distracted') {
    return {
      ...stats,
      distractedDurationSeconds: stats.distractedDurationSeconds + event.seconds
    }
  }

  if (event.type === 'focus-duration') {
    return {
      ...stats,
      focusDurationSeconds: stats.focusDurationSeconds + event.seconds
    }
  }

  return {
    ...stats,
    currentFocusStreakSeconds: event.seconds
  }
}

export const trimStatsHistory = (stats: Record<string, DailyStats>, retentionDays: number): Record<string, DailyStats> => {
  const keys = Object.keys(stats).sort()
  const retained = keys.slice(-retentionDays)

  return retained.reduce<Record<string, DailyStats>>((accumulator, key) => {
    accumulator[key] = stats[key]
    return accumulator
  }, {})
}
