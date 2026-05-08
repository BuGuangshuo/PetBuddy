import Store from 'electron-store'
import { app } from 'electron'
import { createEmptyStats, createDefaultStore, defaultSettings, STATS_RETENTION_DAYS } from '@shared/defaults'
import { normalizeStoreShape } from '@shared/storeSchema'
import { applyStatsEvent, trimStatsHistory } from '@shared/stats'
import type { AppSettings, DailyStats, PetAppearanceId, PetSceneKey, ReminderKind, StoreShape } from '@shared/types'

const formatDayKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayKey = () => formatDayKey(new Date())

const normalizeRecentStatsDays = (days: number): number => {
  if (!Number.isFinite(days)) {
    return 1
  }

  return Math.min(STATS_RETENTION_DAYS, Math.max(1, Math.floor(days)))
}

export class PetBuddyStore {
  private readonly store = new Store<StoreShape>({
    name: 'petbuddy',
    defaults: createDefaultStore(),
    serialize: (value) => JSON.stringify(value, null, 2),
    deserialize: (value) => normalizeStoreShape(JSON.parse(value))
  })

  getSettings(): AppSettings {
    return this.store.get('settings', { ...defaultSettings })
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    const shouldRestoreBreakReminders = Object.hasOwn(patch, 'breakIntervalMinutes')
    const next = {
      ...current,
      ...patch,
      breakRemindersMutedOnDate: shouldRestoreBreakReminders
        ? null
        : (patch.breakRemindersMutedOnDate ?? current.breakRemindersMutedOnDate),
      petPosition: {
        ...current.petPosition,
        ...(patch.petPosition ?? {})
      }
    }

    this.store.set('settings', next)
    return next
  }

  setCustomSceneGif(appearanceId: PetAppearanceId, scene: PetSceneKey, absolutePath: string): AppSettings {
    const settings = this.getSettings()
    return this.updateSettings({
      customSceneGifs: {
        ...settings.customSceneGifs,
        [appearanceId]: {
          ...(settings.customSceneGifs[appearanceId] ?? {}),
          [scene]: absolutePath
        }
      }
    })
  }

  clearCustomSceneGif(appearanceId: PetAppearanceId, scene: PetSceneKey): AppSettings {
    const settings = this.getSettings()
    const nextAppearance = { ...(settings.customSceneGifs[appearanceId] ?? {}) }
    delete nextAppearance[scene]

    return this.updateSettings({
      customSceneGifs: {
        ...settings.customSceneGifs,
        [appearanceId]: nextAppearance
      }
    })
  }

  getTodayStats(): DailyStats {
    const key = todayKey()
    const stats = this.store.get('stats', {})
    return stats[key] ?? createEmptyStats(key)
  }

  getRecentStats(days: number): DailyStats[] {
    const stats = this.store.get('stats', {})
    const recentDays = normalizeRecentStatsDays(days)

    return Object.keys(stats)
      .sort()
      .slice(-recentDays)
      .map((key) => stats[key])
  }

  markReminderShown(kind: ReminderKind): DailyStats {
    return this.updateDailyStats({ type: 'shown', kind })
  }

  markReminderAcknowledged(kind: ReminderKind): DailyStats {
    return this.updateDailyStats({ type: 'acknowledged', kind })
  }

  muteBreakRemindersForToday(): AppSettings {
    return this.updateSettings({ breakRemindersMutedOnDate: todayKey() })
  }

  areBreakRemindersMutedToday(): boolean {
    return this.getSettings().breakRemindersMutedOnDate === todayKey()
  }

  addDistractedSeconds(seconds: number): DailyStats {
    return this.updateDailyStats({ type: 'distracted', seconds })
  }

  addFocusDurationSeconds(seconds: number): DailyStats {
    return this.updateDailyStats({ type: 'focus-duration', seconds })
  }

  setFocusStreak(seconds: number): DailyStats {
    return this.updateDailyStats({ type: 'focus-streak', seconds })
  }

  isFirstLaunch(): boolean {
    return !this.getSettings().onboardingCompleted
  }

  getAppVersion(): string {
    return app.getVersion()
  }

  private updateDailyStats(
    event: Parameters<typeof applyStatsEvent>[1]
  ): DailyStats {
    const key = todayKey()
    const history = this.store.get('stats', {})
    const current = history[key] ?? createEmptyStats(key)
    const next = applyStatsEvent(current, event)

    this.store.set('stats', trimStatsHistory({ ...history, [key]: next }, STATS_RETENTION_DAYS))
    return next
  }
}
