import { describe, expect, test } from 'vitest'
import { createReminderQueue } from '../src/shared/reminderQueue'
import type { ReminderEvent } from '../src/shared/types'

const createEvent = (id: string, priority: number): ReminderEvent => ({
  id,
  kind: 'water',
  message: id,
  durationMs: 1000,
  animation: 'drink',
  priority,
  timestamp: Date.now()
})

describe('createReminderQueue', () => {
  test('delays lower priority reminders while one is active', () => {
    const queue = createReminderQueue()

    queue.enqueue(createEvent('water', 1))
    queue.enqueue(createEvent('break', 3))
    queue.enqueue(createEvent('focus', 2))

    expect(queue.next()?.id).toBe('break')
    expect(queue.next()?.id).toBe('focus')
    expect(queue.next()?.id).toBe('water')
    expect(queue.next()).toBeUndefined()
  })
})
