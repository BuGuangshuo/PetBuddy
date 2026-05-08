import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')
const readNormalizedSource = (path: string) =>
  readSource(path)
    .replaceAll('"', "'")
    .replace(/\s+/g, ' ')

describe('pet-main interactions', () => {
  it('does not open settings from pet double click', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).not.toContain('onDoubleClick={() => void window.petBuddy.app.openSettings()}')
  })

  it('does not render the legacy focus status bubble outside active focus sessions', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).not.toContain('!focusSessionCountdown && focusStatusLabel')
  })

  it('renders the pet and focus bubble inside a shared presence container', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("className='pet-presence'")
  })

  it('anchors message bubbles to the pet card so they stay close to the pet', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('{messageBubble}')
    expect(source.indexOf('{messageBubble}')).toBeLessThan(source.indexOf('{breakReminder ? ('))
    expect(source.indexOf('{messageBubble}')).toBeLessThan(source.indexOf("<div className='pet-card' onMouseDown={handleMouseDown}>"))
  })

  it('handles a focus session started event with the start message bubble', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("event.type === 'focus-session-started'")
    expect(source).toContain('focusStartMessage')
  })

  it('prioritizes the focus start message bubble over reminder messages', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('const messageBubble = focusStartMessage ? (')
    expect(source).not.toContain('{activeEvent ? (')
    expect(source).not.toContain('{!activeEvent && focusStartMessage ? (')
  })

  it('handles a focus session completed event with a completion message bubble', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("event.type === 'focus-session-completed'")
    expect(source).toContain('focusCompletionMessage')
    expect(source).toContain('const FOCUS_COMPLETION_MESSAGE_DURATION_MS = 3000')
    expect(source).toContain('const timer = window.setTimeout( () => setFocusCompletionMessage(null), FOCUS_COMPLETION_MESSAGE_DURATION_MS, )')
  })

  it('prioritizes focus completion messages over reminder messages', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('const messageBubble = focusStartMessage ? (')
    expect(source).toContain(') : focusCompletionMessage ? (')
  })

  it('keeps focus done animation driven by focus session updates while completion copy uses a dedicated bubble event', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("event.type === 'focus-session-updated'")
  })

  it('renders dedicated hydration reminder actions instead of a single acknowledge button', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('pendingHydrationEvent ?? activeEvent')
    expect(source).toContain("displayedReminder?.kind === 'water'")
    expect(source).toContain('没空')
    expect(source).toContain('我喝啦')
    expect(source).toContain('知道了')
  })

  it('renders dedicated break reminder actions and follow-up break states', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("displayedReminder?.kind === 'break'")
    expect(source).toContain("activeEvent?.kind !== 'break' && activeEvent")
    expect(source).toContain("className='pet-dialog pet-dialog-break'")
    expect(source).toContain("className='pet-dialog-actions'")
    expect(source).toContain("className='pet-card-anchor'")
    expect(source).toContain('好的我休息会')
    expect(source).toContain('我再干十分钟')
    expect(source).toContain('今天别管我')
    expect(source).toContain('休息就不许再看屏幕了')
    expect(source).toContain('我回来了')
    expect(source).toContain('每天锻炼身体好')
    expect(source).toContain('那十分钟后我再来叫你玩～')
    expect(source).toContain('那我先自己去趴着了...')
  })

  it('keeps break reminders visible for 10 seconds without input before switching to sad copy', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('BREAK_PROMPT_TIMEOUT_MS = 10000')
    expect(source).toContain('const [pendingBreakEvent, setPendingBreakEvent] = useState<ReminderEvent | null>(null)')
    expect(source).toContain("if (event.event.kind === 'break') {")
    expect(source).toContain('setPendingBreakEvent(event.event)')
    expect(source).toContain('const breakReminder = pendingBreakEvent ??')
    expect(source).toContain('handleBreakAutoDismiss(breakReminder.id)')
    expect(source).toContain("setBreakInteractionState('sad')")
    expect(source).toContain("setBreakInteractionMessage('忙的话我一会再来叫你...')")
  })

  it('drives hydration interaction scene transitions with dedicated timers', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("interactionScene")
    expect(source).toContain("setHydrationInteractionScene('sad')")
    expect(source).toContain("setHydrationInteractionScene('drinking')")
    expect(source).toContain("setHydrationInteractionScene('hydrationDone')")
    expect(source).toContain('HYDRATION_DEFER_DURATION_MS = 5000')
    expect(source).toContain('HYDRATION_DRINKING_DURATION_MS = 5000')
    expect(source).toContain('HYDRATION_DONE_DURATION_MS = 5000')
  })

  it('auto-defers hydration reminders after 10 seconds without input', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('HYDRATION_PROMPT_TIMEOUT_MS = 10000')
    expect(source).toContain("displayedReminder?.kind !== 'water'")
    expect(source).toContain('handleHydrationDefer(displayedReminder.id)')
    expect(source).toContain('setPendingHydrationEvent(event.event)')
    expect(source).toContain("setHydrationAutoDeferMessage('不理我 5555～')")
  })

  it('switches immediately to the latest reminder state and bubble copy', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("if (event.type === 'reminder') {")
    expect(source).toContain('setActiveEvent(event.event)')
    expect(source).toContain("if (event.event.kind === 'water') {")
    expect(source).not.toContain('queuedReminderEvents')
    expect(source).not.toContain('isReminderDisplayBlockedRef')
  })

  it('handles a manual hydration completion event with the same drinking scene transition', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("event.type === 'hydration-completed'")
    expect(source).toContain('window.petBuddy.pet.completeHydration(reminderId)')
    expect(source).toContain("setHydrationInteractionScene('drinking')")
    expect(source).toContain("setHydrationInteractionScene('hydrationDone')")
  })

  it('uses the same focus start and completion override for gif scene selection', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('const sceneOverride: PetSceneKey | null =')
    expect(source).toContain("focusStartMessage ? 'focusGuard'")
    expect(source).toContain("focusCompletionMessage ? 'focusDone' : null")
    expect(source).toContain('sceneOverride,')
  })

  it('skips an active hydration reminder when focus start or completion takes over', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('const dismissHydrationReminderForFocusTransition = () => {')
    expect(source).toContain("if (reminder?.kind !== 'water') {")
    expect(source).toContain('acknowledgeReminder(reminder.id)')
    expect(source).toContain('dismissHydrationReminderForFocusTransition()')
  })

  it('drives break interaction scenes with breakRunning and a continuous movement loop', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('const startBreakRunning = () => {')
    expect(source).toContain("setInteractionScene('breakRunning')")
    expect(source).toContain("setInteractionScene('breakDone')")
    expect(source).toContain("setInteractionScene('sad')")
    expect(source).toContain('BREAK_DONE_DURATION_MS = 5000')
    expect(source).toContain('BREAK_SKIP_DURATION_MS = 5000')
    expect(source).toContain('BREAK_SNOOZE_DURATION_MS = 5000')
    expect(source).toContain('BREAK_SNOOZE_DELAY_MS = 10 * 60 * 1000')
    expect(source).toContain('BREAK_RUNNING_SPEED_PX_PER_SECOND')
    expect(source).toContain('BREAK_RUNNING_DIRECTION_CHANGE_MIN_MS')
    expect(source).toContain('BREAK_RUNNING_DIRECTION_CHANGE_MAX_MS')
    expect(source).toContain('requestAnimationFrame')
    expect(source).not.toContain('BREAK_RUNNING_MOVE_INTERVAL_MS = 1200')
    expect(source).not.toContain('movePetToRandomNearbyPosition()')
  })

  it('allows the main process to start breakRunning directly from a pet event', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("if (event.type === 'break-started')")
    expect(source).toContain('startBreakRunning();')
  })

  it('switches the break visual state to breakDone immediately when the user returns', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('const breakInteractionScene: PetSceneKey | null =')
    expect(source).toContain("breakInteractionState === 'running'")
    expect(source).toContain("? 'breakRunning'")
    expect(source).toContain("breakInteractionState === 'done'")
    expect(source).toContain("? 'breakDone'")
    expect(source).toContain('stopBreakRunningMotion()')
    expect(source).toContain("setBreakInteractionState('done')")
  })

  it('updates the rendered gif asset before paint when the scene changes', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('useLayoutEffect')
    expect(source).toContain('const nextCandidates = getPetSceneAssetCandidates(appearance, currentScene)')
  })

  it('reports the required pet window width so long reminder bubbles can expand without scrollbars', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')
    const helperSource = readNormalizedSource('src/renderer/src/petWindowContentWidth.ts')

    expect(source).toContain('ResizeObserver')
    expect(source).toContain('window.petBuddy?.app.setPetWindowContentWidth')
    expect(source).toContain("document.querySelector('.pet-stage')")
    expect(source).toContain("querySelectorAll<HTMLElement>('.pet-bubble, .pet-dialog')")
    expect(source).toContain('getPetWindowContentWidth({')
    expect(helperSource).toContain('const stageCenterX = (stageRect.left + stageRect.right) / 2')
    expect(helperSource).toContain('Math.ceil(maxDistanceFromCenter * 2)')
    expect(source.indexOf('const breakReminder =')).toBeLessThan(source.indexOf('const reportContentWidth = () => {'))
  })

  it('forces the breakDone asset synchronously and remounts the gif node when the user returns', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain('resolvePetSceneAsset')
    expect(source).toContain("resolvePetSceneAsset(appearance, 'breakDone')")
    expect(source).toContain("selectedSceneRef.current = { appearanceId: appearance.id, scene: 'breakDone', }")
    expect(source).toContain("key={`${appearance.id}:${currentScene}:${currentAsset ?? 'empty'}`}")
  })

  it('keeps the focus countdown bubble visible and frozen while a break pauses focus', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("payload.focusSession.status === 'paused'")
    expect(source).toContain('payload.focusSession.pausedRemainingMs')
    expect(source).toContain('Math.ceil(payload.focusSession.pausedRemainingMs / 1000)')
    expect(source).toContain('window.petBuddy.app .pauseFocusSessionForBreak()')
    expect(source).toContain('window.petBuddy.app .resumeFocusSessionAfterBreak()')
  })

  it('hides the focus countdown bubble while breakRunning or breakDone is on screen', () => {
    const source = readNormalizedSource('src/renderer/src/pet-main.tsx')

    expect(source).toContain("const shouldHideFocusSessionCountdown = breakInteractionState === 'running' || breakInteractionState === 'done'")
    expect(source).toContain('if (shouldHideFocusSessionCountdown || !payload) {')
  })
})
