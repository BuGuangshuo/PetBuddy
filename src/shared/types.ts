export type ReminderKind = 'break' | 'water' | 'focusNudge'
export type PetAnimation = 'idle' | 'run' | 'nudge' | 'drink' | 'rest'
export type PermissionState = 'unknown' | 'granted' | 'denied'
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'unavailable'
  | 'error'
export type PetAppearanceId = 'line-dog' | 'golden-puppy'
export type PetSceneKey =
  | 'default'
  | 'sit'
  | 'happy'
  | 'breakPrompt'
  | 'breakRunning'
  | 'breakDone'
  | 'hydrationPrompt'
  | 'drinking'
  | 'hydrationDone'
  | 'focusGuard'
  | 'focusAlert'
  | 'focusDone'
  | 'sad'
  | 'sleeping'
export type PetAssetGroupKey =
  | 'idle'
  | 'happy'
  | 'breakPrompt'
  | 'breakRunning'
  | 'breakDone'
  | 'hydrationPrompt'
  | 'drinking'
  | 'hydrationDone'
  | 'focusGuard'
  | 'focusAlert'
  | 'focusDone'
  | 'sad'
  | 'sleeping'
export type PetSceneGroups<TAssetGroupKey extends string = PetAssetGroupKey> = Readonly<
  Record<PetSceneKey, readonly TAssetGroupKey[]>
>
export type PetAnimationAssets<TAssetGroupKey extends string = PetAssetGroupKey> = Readonly<
  Record<PetAnimation, readonly TAssetGroupKey[]>
>
export type CustomSceneGifMap = Partial<Record<PetAppearanceId, Partial<Record<PetSceneKey, string>>>>

export interface PetPosition {
  x: number
  y: number
}

export interface PetAppearance<TAssetGroupKey extends string = PetAssetGroupKey> {
  id: PetAppearanceId
  displayName: string
  defaultScale: number
  assets: PetAnimationAssets<TAssetGroupKey>
  sceneGroups: PetSceneGroups<TAssetGroupKey>
}

export interface AppSettings {
  breakIntervalMinutes: number
  breakRemindersMutedOnDate: string | null
  waterIntervalMinutes: number
  focusSessionMinutes: number
  focusModeEnabled: boolean
  focusGraceSeconds: number
  launchAtLogin: boolean
  checkUpdatesOnStartup: boolean
  selectedPetAppearance: PetAppearance['id']
  petPosition: PetPosition
  distractingApps: string[]
  onboardingCompleted: boolean
  customSceneGifs: CustomSceneGifMap
}

export interface ReminderEvent {
  id: string
  kind: ReminderKind
  message: string
  durationMs: number
  animation: PetAnimation
  priority: number
  timestamp: number
}

export interface ReminderCounts {
  break: number
  water: number
  focusNudge: number
}

export interface DailyStats {
  date: string
  shown: ReminderCounts
  acknowledged: ReminderCounts
  distractedDurationSeconds: number
  focusDurationSeconds: number
  currentFocusStreakSeconds: number
}

export interface SchedulerSnapshot {
  now: number
  breakDue: boolean
  waterDue: boolean
}

export interface FocusSample {
  appId: string | null
  timestamp: number
}

export interface FocusMonitorState {
  currentDistractingApp: string | null
  distractingSince: number | null
  totalDistractedSeconds: number
  currentFocusStreakSeconds: number
  shouldNudge: boolean
}

export interface FocusSession {
  startedAt: number
  endsAt: number
}

export type FocusSessionStatus = 'idle' | 'active' | 'paused' | 'done'

export interface FocusSessionState {
  session: FocusSession | null
  status: FocusSessionStatus
  doneEndsAt: number | null
  pausedRemainingMs: number | null
}

export interface StoreShape {
  version: number
  settings: AppSettings
  stats: Record<string, DailyStats>
}

export interface UpdateState {
  status: UpdateStatus
  message: string
  currentVersion: string
  availableVersion: string | null
  downloadPercent: number | null
  canCheck: boolean
}
