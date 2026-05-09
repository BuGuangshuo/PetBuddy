import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createInitialFocusState, stepFocusMonitor } from '@shared/focusSession'
import { normalizeDistractingDomain } from '@shared/distractingDomains'
import type { AppSettings } from '@shared/types'

const execFileAsync = promisify(execFile)

interface FrontmostSample {
  appId: string | null
  domain: string | null
}

interface FocusMonitorOptions {
  getSettings: () => AppSettings
  shouldMonitor: () => boolean
  hasPermission: () => boolean
  onDistractedDelta: (seconds: number) => void
  onFocusStreak: (seconds: number) => void
  onNudge: () => void
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
  private runId = 0

  constructor(private readonly options: FocusMonitorOptions) {}

  start(): void {
    this.stop()
    const runId = ++this.runId
    this.timer = setInterval(() => {
      void this.poll(runId)
    }, 5000)
  }

  stop(): void {
    this.runId += 1
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    this.resetState()
  }

  private resetState(): void {
    this.state = createInitialFocusState()
    this.hasNudgedCurrentSession = false
  }

  private isActiveRun(runId: number): boolean {
    return this.timer !== null && this.runId === runId
  }

  private async poll(runId: number): Promise<void> {
    try {
      const settings = this.options.getSettings()
      if (
        !settings.focusModeEnabled ||
        !this.options.shouldMonitor() ||
        !this.options.hasPermission()
      ) {
        if (this.isActiveRun(runId)) {
          this.resetState()
        }
        return
      }

      const sample = await this.readFrontmostSample()
      if (!this.isActiveRun(runId)) {
        return
      }

      const nextSettings = this.options.getSettings()
      if (
        !nextSettings.focusModeEnabled ||
        !this.options.shouldMonitor() ||
        !this.options.hasPermission()
      ) {
        this.resetState()
        return
      }

      const previousDistracted = this.state.totalDistractedSeconds
      this.state = stepFocusMonitor(
        this.state,
        { ...sample, timestamp: Date.now() },
        {
          distractingApps: nextSettings.distractingApps,
          distractingDomains: nextSettings.distractingDomains,
          focusGraceSeconds: nextSettings.focusGraceSeconds
        }
      )

      const delta = this.state.totalDistractedSeconds - previousDistracted
      if (delta > 0) {
        this.options.onDistractedDelta(delta)
      }

      this.options.onFocusStreak(this.state.currentFocusStreakSeconds)

      if (!this.state.currentDistractingApp) {
        this.hasNudgedCurrentSession = false
      } else if (this.state.shouldNudge && !this.hasNudgedCurrentSession) {
        this.hasNudgedCurrentSession = true
        this.options.onNudge()
      }
    } catch {
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
): Promise<string | null> => {
  const browser = BROWSER_BY_BUNDLE_ID.get(appId)
  if (!browser) {
    return null
  }

  try {
    const url = await runScript(browser.urlScript)
    return url ? normalizeDistractingDomain(url) : null
  } catch {
    return null
  }
}

export const getFrontmostSample = async (
  options: GetFrontmostSampleOptions = {}
): Promise<FrontmostSample> => {
  const platform = options.platform ?? process.platform
  if (platform !== 'darwin') {
    return { appId: null, domain: null }
  }

  const runScript = options.runAppleScript ?? runAppleScript
  const appId = await readFrontmostAppId(runScript)
  if (appId === null) {
    return { appId: null, domain: null }
  }

  return {
    appId,
    domain: await readBrowserDomain(appId, runScript)
  }
}
