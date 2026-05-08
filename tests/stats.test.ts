import { describe, expect, test } from 'vitest'
import { createEmptyStats } from '../src/shared/defaults'
import { applyStatsEvent, trimStatsHistory } from '../src/shared/stats'

describe('applyStatsEvent', () => {
  test('tracks shown, acknowledged, distracted duration, and focus streak', () => {
    let stats = createEmptyStats('2026-05-07')

    stats = applyStatsEvent(stats, { type: 'shown', kind: 'break' })
    stats = applyStatsEvent(stats, { type: 'acknowledged', kind: 'break' })
    stats = applyStatsEvent(stats, { type: 'distracted', seconds: 25 })
    stats = applyStatsEvent(stats, { type: 'focus-duration', seconds: 1500 })
    stats = applyStatsEvent(stats, { type: 'focus-streak', seconds: 300 })

    expect(stats.shown.break).toBe(1)
    expect(stats.acknowledged.break).toBe(1)
    expect(stats.distractedDurationSeconds).toBe(25)
    expect(stats.focusDurationSeconds).toBe(1500)
    expect(stats.currentFocusStreakSeconds).toBe(300)
  })
})

describe('trimStatsHistory', () => {
  test('retains only the most recent configured days', () => {
    const history = {
      '2026-05-01': createEmptyStats('2026-05-01'),
      '2026-05-02': createEmptyStats('2026-05-02'),
      '2026-05-03': createEmptyStats('2026-05-03')
    }

    expect(Object.keys(trimStatsHistory(history, 2))).toEqual(['2026-05-02', '2026-05-03'])
  })
})
