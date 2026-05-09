import type { ReminderEvent } from './types'

export interface ReminderQueue {
  enqueue(event: ReminderEvent): void
  next(): ReminderEvent | undefined
  peek(): ReminderEvent | undefined
  removeWhere(predicate: (event: ReminderEvent) => boolean): ReminderEvent[]
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
    removeWhere(predicate) {
      const removed: ReminderEvent[] = []

      for (let index = queue.length - 1; index >= 0; index -= 1) {
        if (predicate(queue[index])) {
          const [event] = queue.splice(index, 1)
          if (event) {
            removed.unshift(event)
          }
        }
      }

      return removed
    },
    size() {
      return queue.length
    }
  }
}
