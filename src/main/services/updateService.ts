import { shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateState } from '@shared/types'

const { autoUpdater } = electronUpdater

export class UpdateService {
  private state: UpdateState = {
    status: 'idle',
    message: '尚未检查更新。'
  }

  constructor() {
    autoUpdater.autoDownload = false
    autoUpdater.on('checking-for-update', () => {
      this.state = { status: 'checking', message: '正在检查更新…' }
    })
    autoUpdater.on('update-available', (info) => {
      this.state = { status: 'available', message: `发现新版本 ${info.version}` }
    })
    autoUpdater.on('update-not-available', () => {
      this.state = { status: 'not-available', message: '已经是最新版本。' }
    })
    autoUpdater.on('error', (error) => {
      this.state = { status: 'error', message: error.message }
    })
  }

  getState(): UpdateState {
    return this.state
  }

  async checkNow(): Promise<UpdateState> {
    this.state = { status: 'checking', message: '正在检查更新…' }

    try {
      await autoUpdater.checkForUpdates()
      return this.state
    } catch (error) {
      this.state = {
        status: 'error',
        message: error instanceof Error ? error.message : '检查更新失败。'
      }
      return this.state
    }
  }

  async openReleasesPage(): Promise<void> {
    await shell.openExternal('https://github.com/alanbu/PetBuddy/releases')
  }
}
