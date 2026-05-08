const DISABLED_INTERVAL_MINUTES = 9999

export const isReminderEnabled = (minutes: number): boolean => minutes > 0 && minutes < DISABLED_INTERVAL_MINUTES

export const nextReminderInterval = (enabled: boolean, defaultMinutes: number): number =>
  enabled ? defaultMinutes : DISABLED_INTERVAL_MINUTES
