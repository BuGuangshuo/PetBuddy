import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('manual focus completion flow', () => {
  it('reuses focus done state for automatic and manual completion, with pet bubble on both paths', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8')

    expect(source).toContain("type: 'focus-session-completed'")
    expect(source).toContain('const completeFocusSession = (options?: { showBubble?: boolean }): void => {')
    expect(source).toContain('getElapsedFocusSessionSeconds(activeFocusSession, now)')
    expect(source).toContain('store.addFocusDurationSeconds(elapsedFocusSeconds)')
    expect(source).toContain("type: 'focus-session-updated'")
    expect(source).toContain('const FOCUS_DONE_DURATION_MS = 3000')
    expect(source).toContain('const activateFocusDoneState = (now: number): void => {')
    expect(source).toContain('focusDoneUntil = now + FOCUS_DONE_DURATION_MS')
    expect(source).toContain('setTimeout(() => completeFocusSession({ showBubble: true }), durationMs)')
    expect(source).toContain("message: '收工！我陪你休息会'")
    expect(source).toContain('completeFocusSession({ showBubble: true })')
    expect(source).not.toContain('showFocusCompletionDialog')
  })

  it('does not use an electron dialog for focus completion', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8')

    expect(source).not.toContain('dialog.showMessageBox')
    expect(source).not.toContain("buttons: ['好']")
  })

  it('pauses an active focus session for breaks and resumes it with the remaining duration afterward', () => {
    const source = readFileSync(join(process.cwd(), 'src/main/index.ts'), 'utf8')

    expect(source).toContain('let pausedFocusRemainingMs: number | null = null')
    expect(source).toContain('const pauseFocusSessionForBreak = (): SettingsPayload => {')
    expect(source).toContain('pausedFocusRemainingMs = Math.max(0, activeFocusSession.endsAt - now)')
    expect(source).toContain('const resumeFocusSessionAfterBreak = (): SettingsPayload => {')
    expect(source).toContain('activeFocusSession = {')
    expect(source).toContain('endsAt: now + pausedFocusRemainingMs')
    expect(source).toContain("? 'paused'")
  })
})
