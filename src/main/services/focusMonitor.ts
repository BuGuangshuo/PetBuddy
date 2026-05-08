import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createInitialFocusState, stepFocusMonitor } from '@shared/focusSession'
import type { AppSettings } from '@shared/types'

const execFileAsync = promisify(execFile)

interface FocusMonitorOptions {
  getSettings: () => AppSettings
  hasPermission: () => boolean
  onDistractedDelta: (seconds: number) => void
  onFocusStreak: (seconds: number) => void
  onNudge: () => void
}

export class FocusMonitorService {
  private timer: NodeJS.Timeout | null = null
  private state = createInitialFocusState()
  private hasNudgedCurrentSession = false

  constructor(private readonly options: FocusMonitorOptions) {}

  start(): void {
    this.stop()
    this.timer = setInterval(async () => {
      const settings = this.options.getSettings()
      if (!settings.focusModeEnabled || !this.options.hasPermission()) {
        return
      }

      const appId = await getFrontmostApp()
      const previousDistracted = this.state.totalDistractedSeconds
      this.state = stepFocusMonitor(
        this.state,
        { appId, timestamp: Date.now() },
        {
          distractingApps: settings.distractingApps,
          focusGraceSeconds: settings.focusGraceSeconds
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
    }, 5000)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

const getFrontmostApp = async (): Promise<string | null> => {
  if (process.platform !== 'darwin') {
    return null
  }

  try {
    const { stdout } = await execFileAsync('osascript', [
      '-e',
      'tell application "System Events" to get name of first application process whose frontmost is true'
    ])

    return stdout.trim() || null
  } catch {
    return null
  }
}
