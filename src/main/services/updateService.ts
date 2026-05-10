import { app, shell } from 'electron'
import electronUpdater from 'electron-updater'
import type { ProgressInfo, UpdateDownloadedEvent } from 'electron-updater'
import type { UpdateState } from '@shared/types'

const { autoUpdater } = electronUpdater

// 配置更新源
const UPDATE_SOURCE = process.env.UPDATE_SOURCE || 'cdn'
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-hangzhou'
const OSS_BUCKET = process.env.OSS_BUCKET || 'petbuddy-releases'

// 根据配置设置更新源
if (UPDATE_SOURCE === 'cdn') {
  const cdnUrl = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: cdnUrl,
    channel: 'latest'
  })
  console.log(`[UpdateService] 使用 CDN 更新源: ${cdnUrl}`)
} else {
  console.log('[UpdateService] 使用 GitHub 更新源')
}

const isUpdateRuntimeSupported =
  ((process.platform === 'darwin' && process.arch === 'arm64') || process.platform === 'win32') &&
  app.isPackaged

const buildUnsupportedState = (
  currentVersion: string,
  message = '当前构建不支持应用内更新。'
): UpdateState => ({
  status: 'unavailable',
  message,
  currentVersion,
  availableVersion: null,
  downloadPercent: null,
  canCheck: false
})

const roundPercent = (percent: number): number => {
  if (!Number.isFinite(percent)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(percent)))
}

export class UpdateService {
  private state: UpdateState
  private readonly listeners = new Set<(state: UpdateState) => void>()

  constructor(private readonly currentVersion: string) {
    this.state = isUpdateRuntimeSupported
      ? {
          status: 'idle',
          message: '尚未检查更新。',
          currentVersion,
          availableVersion: null,
          downloadPercent: null,
          canCheck: true
        }
      : buildUnsupportedState(
          currentVersion,
          app.isPackaged
            ? '当前构建不支持应用内更新。'
            : '当前构建不支持应用内更新，请使用已打包版本。'
        )

    autoUpdater.autoDownload = false

    autoUpdater.on('checking-for-update', () => {
      this.setState({
        status: 'checking',
        message: '正在检查更新…',
        availableVersion: null,
        downloadPercent: null,
        canCheck: false
      })
    })

    autoUpdater.on('update-available', (info) => {
      this.setAvailableState(info)
    })

    autoUpdater.on('update-not-available', () => {
      this.setState({
        status: 'not-available',
        message: '已经是最新版本。',
        availableVersion: null,
        downloadPercent: null,
        canCheck: true
      })
    })

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      const version = this.state.availableVersion
      this.setState({
        status: 'downloading',
        message: `正在下载更新… ${roundPercent(progress.percent)}%`,
        availableVersion: version,
        downloadPercent: roundPercent(progress.percent),
        canCheck: false
      })
    })

    autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
      this.setState({
        status: 'downloaded',
        message: '准备安装，应用将重新打开。',
        availableVersion: event.version ?? this.state.availableVersion,
        downloadPercent: 100,
        canCheck: false
      })
      autoUpdater.quitAndInstall()
    })

    autoUpdater.on('error', (error) => {
      this.setState({
        status: 'error',
        message: error.message,
        availableVersion: this.state.availableVersion,
        downloadPercent: null,
        canCheck: isUpdateRuntimeSupported
      })
    })
  }

  onStateChanged(listener: (state: UpdateState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState(): UpdateState {
    return this.state
  }

  async checkNow(): Promise<UpdateState> {
    if (!isUpdateRuntimeSupported || this.state.status === 'checking' || this.state.status === 'downloading') {
      return this.state
    }

    this.setState({
      status: 'checking',
      message: '正在检查更新…',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false
    })

    try {
      const result = await autoUpdater.checkForUpdates()

      if (result === null) {
        this.setState({
          status: 'unavailable',
          message: '当前构建不支持应用内更新，请使用已打包版本。',
          availableVersion: null,
          downloadPercent: null,
          canCheck: false
        })
      }

      return this.state
    } catch (error) {
      this.setState({
        status: 'error',
        message: error instanceof Error ? error.message : '检查更新失败。',
        availableVersion: null,
        downloadPercent: null,
        canCheck: true
      })
      return this.state
    }
  }

  async downloadUpdate(): Promise<UpdateState> {
    if (
      !isUpdateRuntimeSupported ||
      this.state.status === 'checking' ||
      this.state.status === 'downloading' ||
      this.state.availableVersion === null
    ) {
      return this.state
    }

    this.setState({
      status: 'downloading',
      message: '正在下载更新… 0%',
      availableVersion: this.state.availableVersion,
      downloadPercent: 0,
      canCheck: false
    })

    try {
      await autoUpdater.downloadUpdate()
      return this.state
    } catch (error) {
      this.setState({
        status: 'error',
        message: error instanceof Error ? error.message : '下载更新失败。',
        availableVersion: this.state.availableVersion,
        downloadPercent: null,
        canCheck: true
      })
      return this.state
    }
  }

  async openReleasesPage(): Promise<void> {
    await shell.openExternal('https://github.com/alanbu/PetBuddy/releases')
  }

  private setAvailableState(info: { version: string }): void {
    this.setState({
      status: 'available',
      message: `发现新版本 ${info.version}`,
      availableVersion: info.version,
      downloadPercent: null,
      canCheck: true
    })
  }

  private setState(patch: Omit<UpdateState, 'currentVersion'>): void {
    this.state = {
      currentVersion: this.currentVersion,
      ...patch
    }

    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}
