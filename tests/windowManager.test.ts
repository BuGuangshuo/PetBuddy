import { beforeEach, describe, expect, it, vi } from 'vitest'

const trayOn = vi.fn()
const traySetToolTip = vi.fn()
const traySetContextMenu = vi.fn()
const trayConstructor = vi.fn(() => ({
  setToolTip: traySetToolTip,
  setContextMenu: traySetContextMenu,
  on: trayOn
}))
const createFromDataURL = vi.fn(() => ({
  resize: vi.fn(() => 'tray-icon')
}))
const buildFromTemplate = vi.fn((_template?: unknown) => 'context-menu')
const menuPopup = vi.fn()
const getPrimaryDisplay = vi.fn(() => ({
  workArea: { x: 0, y: 0, width: 1440, height: 900 }
}))
const getDisplayNearestPoint = vi.fn(() => ({
  workArea: { x: 0, y: 0, width: 1440, height: 900 }
}))
const petWindowOn = vi.fn()
const petWindowSetVisibleOnAllWorkspaces = vi.fn()
const petWindowSetAlwaysOnTop = vi.fn()
const petWindowSetFocusable = vi.fn()
const petWindowSetIgnoreMouseEvents = vi.fn()
const petWindowSetSize = vi.fn()
const petWindowSetBounds = vi.fn()
const petWindowGetBounds = vi.fn(() => ({
  x: 100,
  y: 100,
  width: 176,
  height: 320
}))
const petWindowShowInactive = vi.fn()
const petWindowHide = vi.fn()
const petWindowLoadURL = vi.fn()
const petWindowLoadFile = vi.fn()
const petWindowWebContentsOn = vi.fn()
const petWindowWebContentsExecuteJavaScript = vi.fn(() => Promise.resolve({}))
const petWindow = {
  isVisible: vi.fn(() => true),
  on: petWindowOn,
  setVisibleOnAllWorkspaces: petWindowSetVisibleOnAllWorkspaces,
  setAlwaysOnTop: petWindowSetAlwaysOnTop,
  setFocusable: petWindowSetFocusable,
  setIgnoreMouseEvents: petWindowSetIgnoreMouseEvents,
  setSize: petWindowSetSize,
  setBounds: petWindowSetBounds,
  getBounds: petWindowGetBounds,
  showInactive: petWindowShowInactive,
  hide: petWindowHide,
  loadURL: petWindowLoadURL,
  loadFile: petWindowLoadFile,
  webContents: {
    on: petWindowWebContentsOn,
    executeJavaScript: petWindowWebContentsExecuteJavaScript
  }
}
const settingsWindowOn = vi.fn()
const settingsWindowShow = vi.fn()
const settingsWindowFocus = vi.fn()
const settingsWindowLoadURL = vi.fn()
const settingsWindowLoadFile = vi.fn()
const settingsWindowWebContentsOn = vi.fn()
const settingsWindowWebContentsExecuteJavaScript = vi.fn(() => Promise.resolve({}))
const settingsWindowIsVisible = vi.fn(() => true)
const settingsWindow = {
  on: settingsWindowOn,
  show: settingsWindowShow,
  focus: settingsWindowFocus,
  isVisible: settingsWindowIsVisible,
  loadURL: settingsWindowLoadURL,
  loadFile: settingsWindowLoadFile,
  webContents: {
    on: settingsWindowWebContentsOn,
    executeJavaScript: settingsWindowWebContentsExecuteJavaScript
  }
}

vi.mock('electron', () => ({
  BrowserWindow: vi.fn((options?: { focusable?: boolean; title?: string }) =>
    options?.focusable === false ? petWindow : settingsWindow
  ),
  Menu: {
    buildFromTemplate: vi.fn((template) => {
      buildFromTemplate(template)
      return {
        popup: menuPopup
      }
    }),
    setApplicationMenu: vi.fn()
  },
  Tray: trayConstructor,
  nativeImage: {
    createFromDataURL
  },
  screen: {
    getPrimaryDisplay,
    getDisplayNearestPoint
  }
}))

describe('WindowManager', () => {
  beforeEach(() => {
    trayOn.mockClear()
    traySetToolTip.mockClear()
    traySetContextMenu.mockClear()
    trayConstructor.mockClear()
    createFromDataURL.mockClear()
    buildFromTemplate.mockClear()
    menuPopup.mockClear()
    getPrimaryDisplay.mockClear()
    getDisplayNearestPoint.mockClear()
    petWindowOn.mockClear()
    petWindow.isVisible.mockClear()
    petWindow.isVisible.mockReturnValue(true)
    petWindowSetVisibleOnAllWorkspaces.mockClear()
    petWindowSetAlwaysOnTop.mockClear()
    petWindowSetFocusable.mockClear()
    petWindowSetIgnoreMouseEvents.mockClear()
    petWindowSetSize.mockClear()
    petWindowSetBounds.mockClear()
    petWindowGetBounds.mockClear()
    petWindowGetBounds.mockReturnValue({
      x: 100,
      y: 100,
      width: 176,
      height: 320
    })
    petWindowShowInactive.mockClear()
    petWindowHide.mockClear()
    petWindowLoadURL.mockClear()
    petWindowLoadFile.mockClear()
    petWindowWebContentsOn.mockClear()
    petWindowWebContentsExecuteJavaScript.mockClear()
    settingsWindowOn.mockClear()
    settingsWindowShow.mockClear()
    settingsWindowFocus.mockClear()
    settingsWindowIsVisible.mockClear()
    settingsWindowIsVisible.mockReturnValue(true)
    settingsWindowLoadURL.mockClear()
    settingsWindowLoadFile.mockClear()
    settingsWindowWebContentsOn.mockClear()
    settingsWindowWebContentsExecuteJavaScript.mockClear()
  })

  it('does not bind tray left click to open settings', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn())

    expect(trayOn).not.toHaveBeenCalledWith('click', expect.any(Function))
  })

  it('creates a tighter pet window and keeps mouse interactions enabled by default', async () => {
    const { BrowserWindow } = await import('electron')
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createPetWindow({ x: 100, y: 100 })

    expect(BrowserWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 176,
        height: 320
      })
    )
    expect(petWindowSetIgnoreMouseEvents).toHaveBeenCalledWith(false)
  })

  it('calculates the first-launch pet position from the primary display bottom-right corner', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    expect(manager.getDefaultPetPosition()).toEqual({
      x: 1264,
      y: 580
    })
  })

  it('can toggle pet mouse passthrough at runtime', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createPetWindow({ x: 100, y: 100 })
    manager.setPetWindowMousePassthrough(false)
    manager.setPetWindowMousePassthrough(true)

    expect(petWindowSetIgnoreMouseEvents).toHaveBeenNthCalledWith(1, false)
    expect(petWindowSetIgnoreMouseEvents).toHaveBeenNthCalledWith(2, false)
    expect(petWindowSetIgnoreMouseEvents).toHaveBeenNthCalledWith(3, true, { forward: true })
  })

  it('keeps the pet window at the minimum width until content asks for more', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createPetWindow({ x: 100, y: 100 })
    manager.setPetWindowContentWidth(120)

    expect(petWindowSetBounds).toHaveBeenCalledWith({
      x: 100,
      y: 100,
      width: 176,
      height: 320
    })
  })

  it('expands the pet window width when reminder content is wider than the minimum width', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createPetWindow({ x: 100, y: 100 })
    manager.setPetWindowContentWidth(248)

    expect(petWindowSetBounds).toHaveBeenCalledWith({
      x: 64,
      y: 100,
      width: 248,
      height: 320
    })
  })

  it('keeps wider reminder bubbles on screen when the pet is near the right edge', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    getDisplayNearestPoint.mockReturnValue({
      workArea: { x: 0, y: 0, width: 320, height: 900 }
    })
    petWindowGetBounds.mockReturnValue({
      x: 144,
      y: 100,
      width: 176,
      height: 320
    })

    manager.createPetWindow({ x: 100, y: 100 })
    manager.setPetWindowContentWidth(248)

    expect(petWindowSetBounds).toHaveBeenCalledWith({
      x: 72,
      y: 100,
      width: 248,
      height: 320
    })
  })

  it('does not show pause actions in the tray menu', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn())

    const [template] = buildFromTemplate.mock.calls.at(-1) ?? [[]]
    const labels = (template as Array<{ label?: string }>).map((item) => item.label)

    expect(labels).not.toContain('暂停 15 分钟')
    expect(labels).not.toContain('暂停 60 分钟')
  })

  it('does not show 打开设置 in the tray menu', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createTray(vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn())

    const [template] = buildFromTemplate.mock.calls.at(-1) ?? [[]]
    const labels = (template as Array<{ label?: string }>).map((item) => item.label)

    expect(labels).not.toContain('打开设置')
  })

  it('shows start focus when no focus session is active', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow

    manager.showPetContextMenu({
      onOpenSettings: vi.fn(),
      onHydrationComplete: vi.fn(),
      onStartBreak: vi.fn(),
      onToggleFocus: vi.fn(),
      onTogglePet: vi.fn(),
      focusSessionActive: false
    })

    expect(buildFromTemplate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ label: '开始专注' })])
    )
  })

  it('does not show pause actions in the pet context menu', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow

    manager.showPetContextMenu({
      onOpenSettings: vi.fn(),
      onHydrationComplete: vi.fn(),
      onStartBreak: vi.fn(),
      onToggleFocus: vi.fn(),
      onTogglePet: vi.fn(),
      focusSessionActive: false
    })

    const [template] = buildFromTemplate.mock.calls.at(-1) ?? [[]]
    const labels = (template as Array<{ label?: string }>).map((item) => item.label)

    expect(labels).not.toContain('暂停 15 分钟')
  })

  it('shows 我喝水了 in the pet context menu and wires it to the hydration callback', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')
    const onHydrationComplete = vi.fn()

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow

    manager.showPetContextMenu({
      onOpenSettings: vi.fn(),
      onHydrationComplete,
      onStartBreak: vi.fn(),
      onToggleFocus: vi.fn(),
      onTogglePet: vi.fn(),
      focusSessionActive: false
    })

    const [template] = buildFromTemplate.mock.calls.at(-1) ?? [[]]
    const hydrationItem = (template as Array<{ label?: string; click?: () => void }>).find(
      (item) => item.label === '我喝水了'
    )

    expect(hydrationItem).toBeDefined()

    hydrationItem?.click?.()

    expect(onHydrationComplete).toHaveBeenCalledTimes(1)
  })

  it('shows 我休息会 in the pet context menu and wires it to the break callback', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')
    const onStartBreak = vi.fn()

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow

    manager.showPetContextMenu({
      onOpenSettings: vi.fn(),
      onHydrationComplete: vi.fn(),
      onStartBreak,
      onToggleFocus: vi.fn(),
      onTogglePet: vi.fn(),
      focusSessionActive: false
    })

    const [template] = buildFromTemplate.mock.calls.at(-1) ?? [[]]
    const breakItem = (template as Array<{ label?: string; click?: () => void }>).find(
      (item) => item.label === '我休息会'
    )

    expect(breakItem).toBeDefined()

    breakItem?.click?.()

    expect(onStartBreak).toHaveBeenCalledTimes(1)
  })

  it('shows end focus when a focus session is active', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow

    manager.showPetContextMenu({
      onOpenSettings: vi.fn(),
      onHydrationComplete: vi.fn(),
      onStartBreak: vi.fn(),
      onToggleFocus: vi.fn(),
      onTogglePet: vi.fn(),
      focusSessionActive: true
    })

    expect(buildFromTemplate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ label: '结束专注' })])
    )
  })

  it('reveals the hidden pet window for break reminders', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow
    petWindow.isVisible.mockReturnValue(false)

    manager.ensurePetVisibleForReminder({
      id: 'break-1',
      kind: 'break',
      message: '起来活动一下',
      durationMs: 8000,
      animation: 'run',
      priority: 1,
      timestamp: Date.now()
    })

    expect(petWindowShowInactive).toHaveBeenCalledTimes(1)
  })

  it('reveals the hidden pet window for focus and water reminders', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow
    petWindow.isVisible.mockReturnValue(false)

    manager.ensurePetVisibleForReminder({
      id: 'focusNudge-1',
      kind: 'focusNudge',
      message: '别分心',
      durationMs: 5000,
      animation: 'nudge',
      priority: 1,
      timestamp: Date.now()
    })

    expect(petWindowShowInactive).toHaveBeenCalledTimes(1)

    manager.ensurePetVisibleForReminder({
      id: 'water-1',
      kind: 'water',
      message: '该喝水了',
      durationMs: 5000,
      animation: 'drink',
      priority: 1,
      timestamp: Date.now()
    })

    expect(petWindowShowInactive).toHaveBeenCalledTimes(2)
  })

  it('does not reveal settings on activate while the pet is visible', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: typeof petWindow }).petWindow = petWindow

    expect(manager.shouldShowSettingsOnActivate()).toBe(false)
  })

  it('does not reveal settings on activate when neither pet nor settings window is visible', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    ;(manager as unknown as { petWindow: { isVisible: () => boolean }; settingsWindow: { isVisible: () => boolean } }).petWindow = {
      isVisible: () => false
    }
    ;(manager as unknown as { petWindow: { isVisible: () => boolean }; settingsWindow: { isVisible: () => boolean } }).settingsWindow = {
      isVisible: () => false
    }

    expect(manager.shouldShowSettingsOnActivate()).toBe(false)
  })

  it('keeps the pet window focusable while the settings window is visible', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createPetWindow({ x: 100, y: 100 })
    manager.showSettings()

    const showHandler = settingsWindowOn.mock.calls.find(([eventName]) => eventName === 'show')?.[1]
    expect(showHandler).toBeTypeOf('function')

    showHandler()

    expect(petWindowSetFocusable).toHaveBeenCalledWith(true)
  })

  it('restores the pet window to non-focusable after the settings window is hidden', async () => {
    const { WindowManager } = await import('../src/main/services/windowManager')
    const manager = new WindowManager('/tmp/preload.js')

    manager.createPetWindow({ x: 100, y: 100 })
    manager.createSettingsWindow()

    const hideHandler = settingsWindowOn.mock.calls.find(([eventName]) => eventName === 'hide')?.[1]
    expect(hideHandler).toBeTypeOf('function')

    settingsWindowIsVisible.mockReturnValue(false)
    hideHandler()

    expect(petWindowSetFocusable).toHaveBeenCalledWith(false)
  })
})
