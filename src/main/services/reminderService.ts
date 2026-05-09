import { BREAK_PRIORITY, FOCUS_PRIORITY, reminderCopy, WATER_PRIORITY } from '@shared/defaults'
import { createReminderQueue } from '@shared/reminderQueue'
import { createReminderScheduler } from '@shared/reminderScheduler'
import type { AppSettings, ReminderEvent, ReminderKind } from '@shared/types'

interface ReminderServiceOptions {
  getSettings: () => AppSettings
  onReminder: (event: ReminderEvent) => void
  onReminderFinished: (event: ReminderEvent) => void
}

const animationByKind: Record<ReminderKind, ReminderEvent['animation']> = {
  break: 'run',
  water: 'drink',
  focusNudge: 'nudge'
}

const durationByKind: Record<ReminderKind, number> = {
  break: 8000,
  water: 5000,
  focusNudge: 5000
}

const priorityByKind: Record<ReminderKind, number> = {
  break: BREAK_PRIORITY,
  water: WATER_PRIORITY,
  focusNudge: FOCUS_PRIORITY
}

const shouldPersistUntilAcknowledged = (kind: ReminderKind): boolean => kind === 'focusNudge'

export class ReminderService {
  private readonly queue = createReminderQueue()
  private scheduler
  private tickTimer: NodeJS.Timeout | null = null
  private activeEvent: ReminderEvent | null = null
  private finishTimer: NodeJS.Timeout | null = null

  constructor(private readonly options: ReminderServiceOptions) {
    this.scheduler = createReminderScheduler(this.readSchedulerOptions())
  }

  start(): void {
    this.stop()
    this.tickTimer = setInterval(() => {
      const kinds = this.scheduler.tick(Date.now())
      kinds.forEach((kind) => {
        if (kind === 'break' && this.options.getSettings().breakRemindersMutedOnDate === this.todayKey()) {
          return
        }

        this.enqueue(kind)
      })
      this.flush()
    }, 1000)
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }

    if (this.finishTimer) {
      clearTimeout(this.finishTimer)
      this.finishTimer = null
    }
  }

  refresh(): void {
    this.scheduler = createReminderScheduler(this.readSchedulerOptions())
  }

  enqueue(kind: ReminderKind): void {
    const event = this.createReminderEvent(kind)

    if (
      this.activeEvent?.kind === 'focusNudge' &&
      event.priority > this.activeEvent.priority
    ) {
      this.clearActiveFinishTimer()
      this.activeEvent = null
    }

    this.queue.enqueue(event)
    this.flush()
  }

  acknowledge(reminderId: string): void {
    if (this.activeEvent?.id === reminderId) {
      this.clearActiveFinishTimer()
      this.finishCurrent()
    }
  }

  snoozeBreak(delayMs: number): void {
    this.scheduler.snoozeBreak(Date.now(), delayMs)
  }

  completeBreak(): void {
    this.scheduler.completeBreak(Date.now())
  }

  clearByKind(kind: ReminderKind): void {
    if (this.activeEvent?.kind === kind) {
      this.clearActiveFinishTimer()
      this.finishCurrent()
    }

    this.queue.removeWhere((event) => event.kind === kind)
  }

  private flush(): void {
    if (this.activeEvent) {
      return
    }

    const event = this.queue.next()
    if (!event) {
      return
    }

    this.activeEvent = event
    this.options.onReminder(event)

    if (!shouldPersistUntilAcknowledged(event.kind)) {
      this.finishTimer = setTimeout(() => this.finishCurrent(), event.durationMs)
    }
  }

  private finishCurrent(): void {
    if (!this.activeEvent) {
      return
    }

    const finished = this.activeEvent
    this.activeEvent = null
    this.options.onReminderFinished(finished)
    this.flush()
  }

  private clearActiveFinishTimer(): void {
    if (this.finishTimer) {
      clearTimeout(this.finishTimer)
      this.finishTimer = null
    }
  }

  private createReminderEvent(kind: ReminderKind): ReminderEvent {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      message: reminderCopy[kind][Math.floor(Math.random() * reminderCopy[kind].length)],
      durationMs: durationByKind[kind],
      animation: animationByKind[kind],
      priority: priorityByKind[kind],
      timestamp: Date.now()
    }
  }

  private readSchedulerOptions() {
    const settings = this.options.getSettings()
    return {
      breakIntervalMinutes: settings.breakIntervalMinutes,
      waterIntervalMinutes: settings.waterIntervalMinutes
    }
  }

  private todayKey(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
