import type { FocusMonitorState, FocusSample, FocusSession, FocusSessionStatus } from './types'
import { domainMatchesList } from './distractingDomains'

interface FocusOptions {
  distractingApps: string[]
  distractingDomains?: string[]
  focusGraceSeconds: number
}

interface FocusSampleInput {
  appId: FocusSample['appId']
  domain?: FocusSample['domain']
  timestamp: FocusSample['timestamp']
}

const BROWSER_APP_IDS = new Set([
  'com.apple.Safari',
  'com.google.Chrome',
  'company.thebrowser.Browser',
  'com.microsoft.edgemac'
])

/**
 * 规范化Windows应用路径，用于比较
 * 统一转换为小写并使用反斜杠
 */
const normalizeWindowsPath = (path: string): string => {
  return path.toLowerCase().replace(/\//g, '\\')
}

/**
 * 检查应用是否为浏览器（支持 macOS 和 Windows）
 */
const isBrowserApp = (appId: string): boolean => {
  // macOS: 使用 bundle identifier
  if (BROWSER_APP_IDS.has(appId)) {
    return true
  }
  
  // Windows: 检查路径中是否包含浏览器名称
  const appIdLower = appId.toLowerCase()
  const windowsBrowsers = ['chrome', 'msedge', 'firefox', 'opera', 'brave', 'vivaldi', 'iexplore', 'microsoftedge']
  return windowsBrowsers.some(browser => appIdLower.includes(browser))
}

/**
 * 检查应用ID是否匹配分心应用列表（支持Windows路径匹配）
 */
const isDistractingApp = (appId: string, distractingApps: string[]): boolean => {
  // 直接匹配
  if (distractingApps.includes(appId)) {
    return true
  }
  
  // Windows路径规范化匹配
  const normalizedAppId = normalizeWindowsPath(appId)
  return distractingApps.some(app => normalizeWindowsPath(app) === normalizedAppId)
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
  sample: FocusSampleInput,
  options: FocusOptions
): FocusMonitorState => {
  const isBrowser = sample.appId !== null && isBrowserApp(sample.appId)
  const isDistracting =
    sample.appId !== null &&
    (isBrowser
      ? domainMatchesList(sample.domain ?? null, options.distractingDomains ?? [])
      : isDistractingApp(sample.appId, options.distractingApps))

  // 调试日志
  if (sample.appId !== null) {
    console.log('[FocusMonitor] Sample:', {
      appId: sample.appId,
      domain: sample.domain,
      isBrowser,
      isDistracting,
      distractingApps: options.distractingApps,
      distractingDomains: options.distractingDomains
    })
  }

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
    previous.currentDistractingApp !== null && previous.distractingSince !== null ? previous.distractingSince : sample.timestamp

  const distractedSeconds = Math.floor((sample.timestamp - distractingSince) / 1000)

  return {
    currentDistractingApp: sample.appId,
    distractingSince,
    totalDistractedSeconds: distractedSeconds,
    currentFocusStreakSeconds: 0,
    shouldNudge: distractedSeconds >= options.focusGraceSeconds
  }
}
