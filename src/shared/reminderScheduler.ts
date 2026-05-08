import type { ReminderKind } from './types'

interface SchedulerOptions {
  breakIntervalMinutes: number
  waterIntervalMinutes: number
}

export interface ReminderScheduler {
  tick(now: number): ReminderKind[]
  reset(): void
  snoozeBreak(now: number, delayMs: number): void
  completeBreak(now: number): void
}

export const createReminderScheduler = (
  options: SchedulerOptions,
  startedAt: number = Date.now()
): ReminderScheduler => {
  const getBreakIntervalMs = () => options.breakIntervalMinutes * 60 * 1000
  const getWaterIntervalMs = () => options.waterIntervalMinutes * 60 * 1000

  let nextBreakAt = startedAt + getBreakIntervalMs()
  let nextWaterAt = startedAt + getWaterIntervalMs()

  return {
    tick(now) {
      const due: ReminderKind[] = []

      if (now >= nextWaterAt) {
        due.push('water')
        nextWaterAt = now + getWaterIntervalMs()
      }

      if (now >= nextBreakAt) {
        due.push('break')
        nextBreakAt = now + getBreakIntervalMs()
      }

      return due
    },
    reset() {
      const now = Date.now()
      nextBreakAt = now + getBreakIntervalMs()
      nextWaterAt = now + getWaterIntervalMs()
    },
    snoozeBreak(now, delayMs) {
      nextBreakAt = now + delayMs
    },
    completeBreak(now) {
      nextBreakAt = now + getBreakIntervalMs()
    }
  }
}
