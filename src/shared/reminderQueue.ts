import type { ReminderEvent } from './types'

export interface ReminderQueue {
  enqueue(event: ReminderEvent): void
  next(): ReminderEvent | undefined
  peek(): ReminderEvent | undefined
  size(): number
}

export const createReminderQueue = (): ReminderQueue => {
  const queue: ReminderEvent[] = []

  return {
    enqueue(event) {
      queue.push(event)
      queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp)
    },
    next() {
      return queue.shift()
    },
    peek() {
      return queue[0]
    },
    size() {
      return queue.length
    }
  }
}
