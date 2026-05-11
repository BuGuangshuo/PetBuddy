import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createInitialFocusState, stepFocusMonitor } from '@shared/focusSession'
import { normalizeDistractingDomain } from '@shared/distractingDomains'
import type { AppSettings } from '@shared/types'
import { getWindowsFrontmostSample, initializeWindowsActiveWindow } from './windowsActiveWindow'

const execFileAsync = promisify(execFile)

export interface FrontmostSample {
  appId: string | null
  domain: string | null
  permissionIssue?: 'browser-automation-denied' | null
  permissionIssueAppName?: string | null
}

interface FocusMonitorOptions {
  getSettings: () => AppSettings
  shouldMonitor: () => boolean
  hasPermission: () => boolean
  onDistractedDelta: (seconds: number) => void
  onFocusStreak: (seconds: number) => void
  onNudge: () => void
  onPermissionIssue?: (issue: NonNullable<FrontmostSample['permissionIssue']>, appName: string | null) => void
  getFrontmostSample?: () => Promise<FrontmostSample>
  getFrontmostApp?: () => Promise<string | null>
}

interface GetFrontmostSampleOptions {
  platform?: NodeJS.Platform
  runAppleScript?: (script: string) => Promise<string | null>
}

interface BrowserDescriptor {
  bundleId: string
  appName: string
  urlScript: string
}

interface BrowserDomainReadResult {
  domain: string | null
  permissionIssue?: FrontmostSample['permissionIssue']
  permissionIssueAppName?: string | null
}

const FRONTMOST_APP_BUNDLE_ID_SCRIPT =
  'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'
const FRONTMOST_APP_NAME_SCRIPT =
  'tell application "System Events" to get name of first application process whose frontmost is true'

const BROWSER_DESCRIPTORS: readonly BrowserDescriptor[] = [
  {
    bundleId: 'com.apple.Safari',
    appName: 'Safari',
    urlScript: 'tell application "Safari" to return URL of current tab of front window'
  },
  {
    bundleId: 'com.google.Chrome',
    appName: 'Google Chrome',
    urlScript: 'tell application "Google Chrome" to return URL of active tab of front window'
  },
  {
    bundleId: 'company.thebrowser.Browser',
    appName: 'Arc',
    urlScript: 'tell application "Arc" to return URL of active tab of front window'
  },
  {
    bundleId: 'com.microsoft.edgemac',
    appName: 'Microsoft Edge',
    urlScript: 'tell application "Microsoft Edge" to return URL of active tab of front window'
  }
]

const BROWSER_BY_BUNDLE_ID = new Map(BROWSER_DESCRIPTORS.map((browser) => [browser.bundleId, browser]))
const BROWSER_BUNDLE_ID_BY_NAME = new Map(BROWSER_DESCRIPTORS.map((browser) => [browser.appName, browser.bundleId]))

export class FocusMonitorService {
  private timer: NodeJS.Timeout | null = null
  private state = createInitialFocusState()
  private hasNudgedCurrentSession = false
  private permissionIssueKey: string | null = null
  private runId = 0

  constructor(private readonly options: FocusMonitorOptions) {}

  start(): void {
    this.stop()
    const runId = ++this.runId
    console.log('[FocusMonitor] ========== Starting monitor, runId:', runId, '==========')
    this.timer = setInterval(() => {
      console.log('[FocusMonitor] ========== Interval triggered, calling poll ==========')
      void this.poll(runId)
    }, 5000)
    
    // 立即执行一次 poll
    console.log('[FocusMonitor] ========== Executing initial poll ==========')
    void this.poll(runId)
  }

  stop(): void {
    this.runId += 1
    if (this.timer) {
      console.log('[FocusMonitor] Stopping monitor')
      clearInterval(this.timer)
      this.timer = null
    }

    this.resetState()
  }

  private resetState(): void {
    this.state = createInitialFocusState()
    this.hasNudgedCurrentSession = false
    this.permissionIssueKey = null
  }

  private isActiveRun(runId: number): boolean {
    return this.timer !== null && this.runId === runId
  }

  private async poll(runId: number): Promise<void> {
    console.log('[FocusMonitor] ========== POLL START ==========')
    try {
      const settings = this.options.getSettings()
      console.log('[FocusMonitor] Settings check:', {
        focusModeEnabled: settings.focusModeEnabled,
        distractingApps: settings.distractingApps,
        distractingDomains: settings.distractingDomains,
        focusGraceSeconds: settings.focusGraceSeconds
      })
      
      const shouldMonitor = this.options.shouldMonitor()
      const hasPermission = this.options.hasPermission()
      console.log('[FocusMonitor] Conditions:', { shouldMonitor, hasPermission })
      
      if (
        !settings.focusModeEnabled ||
        !shouldMonitor ||
        !hasPermission
      ) {
        if (this.isActiveRun(runId)) {
          console.log('[FocusMonitor] Resetting state due to conditions not met')
          this.resetState()
        }
        console.log('[FocusMonitor] ========== POLL END (conditions not met) ==========')
        return
      }

      console.log('[FocusMonitor] Reading frontmost sample...')
      const sample = await this.readFrontmostSample()
      console.log('[FocusMonitor] ========== SAMPLE RECEIVED ==========', sample)

      if (sample.permissionIssue) {
        const issueKey = `${sample.permissionIssue}:${sample.permissionIssueAppName ?? ''}`
        if (issueKey !== this.permissionIssueKey) {
          this.permissionIssueKey = issueKey
          this.options.onPermissionIssue?.(sample.permissionIssue, sample.permissionIssueAppName ?? null)
        }
      } else {
        this.permissionIssueKey = null
      }
      
      if (!this.isActiveRun(runId)) {
        console.log('[FocusMonitor] Run is no longer active, skipping')
        console.log('[FocusMonitor] ========== POLL END (stale run) ==========')
        return
      }

      const nextSettings = this.options.getSettings()
      if (
        !nextSettings.focusModeEnabled ||
        !this.options.shouldMonitor() ||
        !this.options.hasPermission()
      ) {
        console.log('[FocusMonitor] Conditions changed, resetting state')
        this.resetState()
        console.log('[FocusMonitor] ========== POLL END (conditions changed) ==========')
        return
      }

      const previousDistracted = this.state.totalDistractedSeconds
      console.log('[FocusMonitor] Calling stepFocusMonitor...')
      this.state = stepFocusMonitor(
        this.state,
        { ...sample, timestamp: Date.now() },
        {
          distractingApps: nextSettings.distractingApps,
          distractingDomains: nextSettings.distractingDomains,
          focusGraceSeconds: nextSettings.focusGraceSeconds
        }
      )
      console.log('[FocusMonitor] New state:', this.state)

      const delta = this.state.totalDistractedSeconds - previousDistracted
      if (delta > 0) {
        console.log('[FocusMonitor] ========== DISTRACTED DELTA:', delta, '==========')
        this.options.onDistractedDelta(delta)
      }

      this.options.onFocusStreak(this.state.currentFocusStreakSeconds)

      if (!this.state.currentDistractingApp) {
        this.hasNudgedCurrentSession = false
      } else if (this.state.shouldNudge && !this.hasNudgedCurrentSession) {
        console.log('[FocusMonitor] ========== NUDGE TRIGGERED! ==========')
        this.hasNudgedCurrentSession = true
        this.options.onNudge()
      }
      
      console.log('[FocusMonitor] ========== POLL END (success) ==========')
    } catch (error) {
      console.error('[FocusMonitor] ========== POLL ERROR ==========', error)
      // Ignore transient sample-read failures and continue polling on the next interval.
    }
  }

  private async readFrontmostSample(): Promise<FrontmostSample> {
    if (this.options.getFrontmostSample) {
      return this.options.getFrontmostSample()
    }

    if (this.options.getFrontmostApp) {
      return {
        appId: await this.options.getFrontmostApp(),
        domain: null
      }
    }

    return getFrontmostSample()
  }
}

const runAppleScript = async (script: string): Promise<string | null> => {
  const { stdout } = await execFileAsync('osascript', ['-e', script])
  const output = stdout.trim()
  return output || null
}

const isBrowserAutomationDeniedError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes('Not authorized to send Apple events') ||
    error.message.includes('not authorized to send Apple events') ||
    error.message.includes('(-1743)')
  )
}

const escapeAppleScriptString = (value: string): string => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')

const resolveBundleIdFromAppName = async (
  appName: string,
  runScript: (script: string) => Promise<string | null>
): Promise<string | null> => {
  const browserBundleId = BROWSER_BUNDLE_ID_BY_NAME.get(appName)
  if (browserBundleId) {
    return browserBundleId
  }

  try {
    return await runScript(`id of application "${escapeAppleScriptString(appName)}"`)
  } catch {
    return null
  }
}

const readFrontmostAppId = async (
  runScript: (script: string) => Promise<string | null>
): Promise<string | null> => {
  try {
    const bundleId = await runScript(FRONTMOST_APP_BUNDLE_ID_SCRIPT)
    if (bundleId) {
      return bundleId
    }
  } catch {
    // Fall back to the frontmost app name when the bundle identifier is unavailable.
  }

  try {
    const appName = await runScript(FRONTMOST_APP_NAME_SCRIPT)
    if (!appName) {
      return null
    }

    return (await resolveBundleIdFromAppName(appName, runScript)) ?? appName
  } catch {
    return null
  }
}

const readBrowserDomain = async (
  appId: string,
  runScript: (script: string) => Promise<string | null>
): Promise<BrowserDomainReadResult> => {
  const browser = BROWSER_BY_BUNDLE_ID.get(appId)
  if (!browser) {
    return { domain: null }
  }

  try {
    const url = await runScript(browser.urlScript)
    return { domain: url ? normalizeDistractingDomain(url) : null }
  } catch (error) {
    if (isBrowserAutomationDeniedError(error)) {
      return {
        domain: null,
        permissionIssue: 'browser-automation-denied',
        permissionIssueAppName: browser.appName
      }
    }

    return { domain: null }
  }
}

export const getFrontmostSample = async (
  options: GetFrontmostSampleOptions = {}
): Promise<FrontmostSample> => {
  const platform = options.platform ?? process.platform
  
  // Windows平台使用native模块获取活动窗口
  if (platform === 'win32') {
    return getWindowsFrontmostSample()
  }
  
  // macOS平台使用AppleScript
  if (platform === 'darwin') {
    const runScript = options.runAppleScript ?? runAppleScript
    const appId = await readFrontmostAppId(runScript)
    if (appId === null) {
      return { appId: null, domain: null }
    }

    const browserResult = await readBrowserDomain(appId, runScript)
    return {
      appId,
      ...browserResult
    }
  }

  // 其他平台不支持
  return { appId: null, domain: null }
}

/**
 * 初始化平台特定的活动窗口检测
 * 在应用启动时调用
 */
export const initializeFocusMonitor = (): void => {
  if (process.platform === 'win32') {
    initializeWindowsActiveWindow()
  }
}
