import { BrowserWindow, Menu, Tray, nativeImage, screen } from 'electron'
import { join } from 'node:path'
import type { PetPosition, ReminderEvent } from '@shared/types'
import { buildMacApplicationMenuTemplate } from './menuTemplates'

const PET_WIDTH = 176
const PET_HEIGHT = 320
type WorkAreaBounds = {
  x: number
  y: number
  width: number
  height: number
}

const clampPetPositionToBounds = (position: PetPosition, bounds: WorkAreaBounds): PetPosition => ({
  x: Math.min(Math.max(position.x, bounds.x), bounds.x + bounds.width - PET_WIDTH),
  y: Math.min(Math.max(position.y, bounds.y), bounds.y + bounds.height - PET_HEIGHT)
})

const getBottomRightPetPosition = (bounds: WorkAreaBounds): PetPosition => ({
  x: bounds.x + bounds.width - PET_WIDTH,
  y: bounds.y + bounds.height - PET_HEIGHT
})

const trayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#F5EFE6"/>
  <path d="M20 28c0-7.18 5.82-13 13-13s13 5.82 13 13v9.5c0 6.9-5.6 12.5-12.5 12.5h-3C23.6 50 18 44.4 18 37.5V28h2Zm7.5 17h8A8.5 8.5 0 0 0 44 36.5V28c0-4.97-4.03-9-9-9s-9 4.03-9 9v17Zm-6-14.5c1.38 0 2.5 1.12 2.5 2.5v5a2.5 2.5 0 1 1-5 0v-5c0-1.38 1.12-2.5 2.5-2.5Zm21 0c1.38 0 2.5 1.12 2.5 2.5v5a2.5 2.5 0 1 1-5 0v-5c0-1.38 1.12-2.5 2.5-2.5ZM28 28.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-7.2 9.8c1.57 1.87 5.08 1.87 6.65 0" fill="none" stroke="#76512D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

export class WindowManager {
  petWindow: BrowserWindow | null = null
  settingsWindow: BrowserWindow | null = null
  tray: Tray | null = null
  private appMenuActions: {
    appName: string
    onOpenSettings: () => void
    onTogglePet: () => void
    onQuit: () => void
  } | null = null

  constructor(private readonly preloadPath: string) {}

  getDefaultPetPosition(): PetPosition {
    return getBottomRightPetPosition(screen.getPrimaryDisplay().workArea)
  }

  createPetWindow(position: PetPosition): BrowserWindow {
    if (this.petWindow) {
      return this.petWindow
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const { x, y } = clampPetPositionToBounds(position, primaryDisplay.workArea)

    this.petWindow = new BrowserWindow({
      width: PET_WIDTH,
      height: PET_HEIGHT,
      x,
      y,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      focusable: false,
      webPreferences: {
        preload: this.preloadPath,
        sandbox: false
      }
    })

    this.petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })
    this.petWindow.setAlwaysOnTop(true, 'screen-saver')
    this.petWindow.setIgnoreMouseEvents(false)
    this.syncPetWindowFocusability()
    this.petWindow.on('show', () => this.refreshApplicationMenu())
    this.petWindow.on('hide', () => this.refreshApplicationMenu())
    this.attachDiagnostics(this.petWindow, 'pet')
    if (process.env.ELECTRON_RENDERER_URL) {
      this.petWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/pet.html`)
    } else {
      this.petWindow.loadFile(join(__dirname, '../renderer/pet.html'))
    }

    return this.petWindow
  }

  createSettingsWindow(): BrowserWindow {
    if (this.settingsWindow) {
      return this.settingsWindow
    }

    this.settingsWindow = new BrowserWindow({
      width: 980,
      height: 860,
      minWidth: 860,
      minHeight: 760,
      title: 'PetBuddy',
      show: false,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#f6f0e7',
      webPreferences: {
        preload: this.preloadPath,
        sandbox: false
      }
    })

    this.attachDiagnostics(this.settingsWindow, 'settings')
    if (process.env.ELECTRON_RENDERER_URL) {
      this.settingsWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings.html`)
    } else {
      this.settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'))
    }
    this.settingsWindow.on('close', (event) => {
      event.preventDefault()
      this.settingsWindow?.hide()
    })
    this.settingsWindow.on('show', () => this.syncPetWindowFocusability())
    this.settingsWindow.on('hide', () => this.syncPetWindowFocusability())

    return this.settingsWindow
  }

  createTray(onOpenSettings: () => void, onTogglePet: () => void, onToggleFocus: () => void, onCheckUpdates: () => void, onQuit: () => void): Tray {
    if (this.tray) {
      return this.tray
    }

    void onOpenSettings
    const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(trayIconSvg).toString('base64')}`)
    this.tray = new Tray(icon.resize({ width: 18, height: 18 }))
    this.tray.setToolTip('PetBuddy')
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: '显示 / 隐藏宠物', click: onTogglePet },
        { type: 'separator' },
        { label: '切换专注模式', click: onToggleFocus },
        { label: '检查更新', click: onCheckUpdates },
        { type: 'separator' },
        { label: '退出', click: onQuit }
      ])
    )
    return this.tray
  }

  createApplicationMenu(actions: {
    appName: string
    onOpenSettings: () => void
    onTogglePet: () => void
    onQuit: () => void
  }): void {
    this.appMenuActions = actions
    this.refreshApplicationMenu()
  }

  showSettings(): void {
    const window = this.createSettingsWindow()
    window.show()
    window.focus()
  }

  shouldShowSettingsOnActivate(): boolean {
    return false
  }

  togglePetWindow(): void {
    if (!this.petWindow) {
      return
    }

    if (this.petWindow.isVisible()) {
      this.petWindow.hide()
    } else {
      this.petWindow.showInactive()
    }
  }

  ensurePetVisibleForReminder(event: ReminderEvent): void {
    if (!this.petWindow) {
      return
    }

    if (event.kind !== 'break' && event.kind !== 'water') {
      return
    }

    if (!this.petWindow.isVisible()) {
      this.petWindow.showInactive()
    }
  }

  isPetVisible(): boolean {
    return this.petWindow?.isVisible() ?? false
  }

  showPetContextMenu(actions: {
    onOpenSettings: () => void
    onHydrationComplete: () => void
    onStartBreak: () => void
    onToggleFocus: () => void
    onTogglePet: () => void
    focusSessionActive: boolean
  }): void {
    if (!this.petWindow) {
      return
    }

    const menu = Menu.buildFromTemplate([
      { label: '打开设置', click: actions.onOpenSettings },
      { label: '我喝水了', click: actions.onHydrationComplete },
      { label: '我休息会', click: actions.onStartBreak },
      { label: actions.focusSessionActive ? '结束专注' : '开始专注', click: actions.onToggleFocus },
      { type: 'separator' },
      { label: this.petWindow.isVisible() ? '隐藏小狗' : '显示小狗', click: actions.onTogglePet }
    ])

    menu.popup({ window: this.petWindow })
  }

  setPetWindowMousePassthrough(enabled: boolean): void {
    if (!this.petWindow) {
      return
    }

    if (enabled) {
      this.petWindow.setIgnoreMouseEvents(true, { forward: true })
      return
    }

    this.petWindow.setIgnoreMouseEvents(false)
  }

  setPetWindowContentWidth(contentWidth: number): void {
    if (!this.petWindow) {
      return
    }

    const nextWidth = Math.max(PET_WIDTH, Math.ceil(contentWidth))
    const bounds = this.petWindow.getBounds()
    const anchorCenterX = bounds.x + bounds.width / 2
    const display = screen.getDisplayNearestPoint({
      x: Math.round(anchorCenterX),
      y: bounds.y
    })
    const workArea = display.workArea
    const clampedWidth = Math.min(nextWidth, workArea.width)
    const nextX = Math.round(
      Math.min(
        Math.max(anchorCenterX - clampedWidth / 2, workArea.x),
        workArea.x + workArea.width - clampedWidth
      )
    )

    this.petWindow.setBounds({
      x: nextX,
      y: bounds.y,
      width: clampedWidth,
      height: PET_HEIGHT
    })
  }

  movePet(position: PetPosition): void {
    if (!this.petWindow) {
      return
    }

    const display = screen.getDisplayNearestPoint({ x: position.x, y: position.y })
    const { x, y } = clampPetPositionToBounds(position, display.workArea)
    this.petWindow.setPosition(x, y)
  }

  async playReminderMotion(event: ReminderEvent): Promise<void> {
    void event
  }

  private refreshApplicationMenu(): void {
    if (process.platform !== 'darwin' || !this.appMenuActions) {
      return
    }

    Menu.setApplicationMenu(
      Menu.buildFromTemplate(
        buildMacApplicationMenuTemplate({
          appName: this.appMenuActions.appName,
          isPetVisible: this.isPetVisible(),
          onOpenSettings: this.appMenuActions.onOpenSettings,
          onTogglePet: this.appMenuActions.onTogglePet,
          onQuit: this.appMenuActions.onQuit
        })
      )
    )
  }

  private syncPetWindowFocusability(): void {
    this.petWindow?.setFocusable(this.settingsWindow?.isVisible() ?? false)
  }

  private attachDiagnostics(window: BrowserWindow, label: string): void {
    window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${label}] level=${level} ${sourceId}:${line} ${message}`)
    })
    window.webContents.on('did-finish-load', () => {
      setTimeout(() => {
        void window.webContents
          .executeJavaScript(`
            (() => {
              const root = document.getElementById('root');
              const shell = document.querySelector('.settings-shell, .pet-shell');
              const rootRect = root?.getBoundingClientRect?.();
              const shellRect = shell?.getBoundingClientRect?.();
              return {
                href: location.href,
                bodyText: document.body.innerText.slice(0, 200),
                rootHtmlLength: root?.innerHTML.length ?? 0,
                rootChildCount: root?.childElementCount ?? 0,
                bodyBg: getComputedStyle(document.body).backgroundColor,
                rootRect: rootRect ? { x: rootRect.x, y: rootRect.y, width: rootRect.width, height: rootRect.height } : null,
                shellRect: shellRect ? { x: shellRect.x, y: shellRect.y, width: shellRect.width, height: shellRect.height } : null
              };
            })();
          `)
          .then((result) => {
            console.log(`[renderer:${label}] dom-snapshot ${JSON.stringify(result)}`)
          })
          .catch((error) => {
            console.error(`[renderer:${label}] dom-snapshot-error ${error instanceof Error ? error.message : String(error)}`)
          })
      }, 300)
    })
    window.webContents.on('did-fail-load', (_event, code, description, validatedUrl) => {
      console.error(`[renderer:${label}] did-fail-load code=${code} url=${validatedUrl} ${description}`)
    })
    window.webContents.on('render-process-gone', (_event, details) => {
      console.error(`[renderer:${label}] render-process-gone reason=${details.reason} exitCode=${details.exitCode}`)
    })
  }
}
