import { app, net, shell } from 'electron'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import electronUpdater from 'electron-updater'
import type { ProgressInfo, UpdateDownloadedEvent } from 'electron-updater'
import type { UpdateState } from '@shared/types'

const { autoUpdater } = electronUpdater

const UPDATE_SOURCE = process.env.UPDATE_SOURCE || 'cdn'
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-beijing'
const OSS_BUCKET = process.env.OSS_BUCKET || 'petbuddy-releases'
const CDN_BASE_URL = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`
const MANUAL_DMG_DOWNLOAD_DIR = 'PetBuddy Updates'

if (UPDATE_SOURCE === 'cdn') {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: CDN_BASE_URL,
    channel: 'latest'
  })
  console.log(`[UpdateService] 使用 CDN 更新源: ${CDN_BASE_URL}`)
} else {
  console.log('[UpdateService] 使用 GitHub 更新源')
}

const isManualMacUpdateMode = process.platform === 'darwin' && process.arch === 'arm64' && app.isPackaged
const isUpdateRuntimeSupported =
  ((process.platform === 'darwin' && process.arch === 'arm64') || process.platform === 'win32') &&
  app.isPackaged

type ManualMacUpdateInfo = {
  version: string
  dmgUrl: string
  fileName: string
}

const buildUnsupportedState = (
  currentVersion: string,
  message = '当前构建不支持应用内更新。'
): UpdateState => ({
  status: 'unavailable',
  message,
  currentVersion,
  availableVersion: null,
  downloadPercent: null,
  canCheck: false,
  actionLabel: '检查更新'
})

const roundPercent = (percent: number): number => {
  if (!Number.isFinite(percent)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(percent)))
}

const compareVersions = (left: string, right: string): number => {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0
    const rightValue = rightParts[index] ?? 0

    if (leftValue > rightValue) {
      return 1
    }

    if (leftValue < rightValue) {
      return -1
    }
  }

  return 0
}

const parseManualMacRelease = (yamlText: string): ManualMacUpdateInfo => {
  const versionMatch = yamlText.match(/^version:\s*['"]?([^'"\n]+)['"]?\s*$/m)
  const dmgMatch = yamlText.match(/url:\s*['"]?([^'"\n]+\.dmg)['"]?\s*$/m)

  if (!versionMatch?.[1] || !dmgMatch?.[1]) {
    throw new Error('更新元数据缺少 macOS DMG 信息。')
  }

  const fileName = dmgMatch[1].trim()
  return {
    version: versionMatch[1].trim(),
    fileName,
    dmgUrl: `${CDN_BASE_URL}/${encodeURI(fileName)}`
  }
}

export class UpdateService {
  private state: UpdateState
  private readonly listeners = new Set<(state: UpdateState) => void>()
  private manualMacUpdateInfo: ManualMacUpdateInfo | null = null
  private downloadedDmgPath: string | null = null

  constructor(private readonly currentVersion: string) {
    this.state = isUpdateRuntimeSupported
      ? {
          status: 'idle',
          message: isManualMacUpdateMode ? '尚未检查更新。' : '尚未检查更新。',
          currentVersion,
          availableVersion: null,
          downloadPercent: null,
          canCheck: true,
          actionLabel: '检查更新'
        }
      : buildUnsupportedState(
          currentVersion,
          app.isPackaged
            ? '当前构建不支持应用内更新。'
            : '当前构建不支持应用内更新，请使用已打包版本。'
        )

    autoUpdater.autoDownload = false

    autoUpdater.on('checking-for-update', () => {
      if (isManualMacUpdateMode) {
        return
      }

      this.setState({
        status: 'checking',
        message: '正在检查更新…',
        availableVersion: null,
        downloadPercent: null,
        canCheck: false,
        actionLabel: '检查更新'
      })
    })

    autoUpdater.on('update-available', (info) => {
      if (isManualMacUpdateMode) {
        return
      }

      this.setAvailableState(info.version, '发现新版本，准备下载并安装。', '立即更新')
    })

    autoUpdater.on('update-not-available', () => {
      if (isManualMacUpdateMode) {
        return
      }

      this.setState({
        status: 'not-available',
        message: '已经是最新版本。',
        availableVersion: null,
        downloadPercent: null,
        canCheck: true,
        actionLabel: '检查更新'
      })
    })

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      if (isManualMacUpdateMode) {
        return
      }

      const version = this.state.availableVersion
      this.setState({
        status: 'downloading',
        message: `正在下载更新… ${roundPercent(progress.percent)}%`,
        availableVersion: version,
        downloadPercent: roundPercent(progress.percent),
        canCheck: false,
        actionLabel: '正在下载…'
      })
    })

    autoUpdater.on('update-downloaded', (event: UpdateDownloadedEvent) => {
      if (isManualMacUpdateMode) {
        return
      }

      this.setState({
        status: 'downloaded',
        message: '准备安装，应用将重新打开。',
        availableVersion: event.version ?? this.state.availableVersion,
        downloadPercent: 100,
        canCheck: false,
        actionLabel: null
      })
      autoUpdater.quitAndInstall()
    })

    autoUpdater.on('error', (error) => {
      if (isManualMacUpdateMode && this.state.status === 'checking') {
        return
      }

      this.setState({
        status: 'error',
        message: error.message,
        availableVersion: this.state.availableVersion,
        downloadPercent: null,
        canCheck: isUpdateRuntimeSupported,
        actionLabel:
          this.state.status === 'downloaded'
            ? '打开安装包'
            : this.state.availableVersion
              ? '下载更新'
              : '检查更新'
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

    if (isManualMacUpdateMode) {
      return this.checkManualMacUpdate()
    }

    this.setState({
      status: 'checking',
      message: '正在检查更新…',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false,
      actionLabel: '检查更新'
    })

    try {
      const result = await autoUpdater.checkForUpdates()

      if (result === null) {
        this.setState({
          status: 'unavailable',
          message: '当前构建不支持应用内更新，请使用已打包版本。',
          availableVersion: null,
          downloadPercent: null,
          canCheck: false,
          actionLabel: '检查更新'
        })
      }

      return this.state
    } catch (error) {
      this.setState({
        status: 'error',
        message: error instanceof Error ? error.message : '检查更新失败。',
        availableVersion: null,
        downloadPercent: null,
        canCheck: true,
        actionLabel: '检查更新'
      })
      return this.state
    }
  }

  async downloadUpdate(): Promise<UpdateState> {
    if (
      !isUpdateRuntimeSupported ||
      this.state.status === 'checking' ||
      this.state.status === 'downloading'
    ) {
      return this.state
    }

    if (isManualMacUpdateMode) {
      return this.downloadManualMacUpdate()
    }

    if (this.state.availableVersion === null) {
      return this.state
    }

    this.setState({
      status: 'downloading',
      message: '正在下载更新… 0%',
      availableVersion: this.state.availableVersion,
      downloadPercent: 0,
      canCheck: false,
      actionLabel: '正在下载…'
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
        canCheck: true,
        actionLabel: this.state.availableVersion ? '立即更新' : '检查更新'
      })
      return this.state
    }
  }

  async openReleasesPage(): Promise<void> {
    await shell.openExternal('https://github.com/alanbu/PetBuddy/releases')
  }

  private async checkManualMacUpdate(): Promise<UpdateState> {
    this.setState({
      status: 'checking',
      message: '正在检查更新…',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false,
      actionLabel: '检查更新'
    })

    try {
      const response = await net.fetch(`${CDN_BASE_URL}/latest-mac.yml`)
      if (!response.ok) {
        throw new Error(`检查更新失败：${response.status}`)
      }

      const metadata = parseManualMacRelease(await response.text())
      this.manualMacUpdateInfo = metadata
      this.downloadedDmgPath = null

      if (compareVersions(metadata.version, this.currentVersion) <= 0) {
        this.setState({
          status: 'not-available',
          message: '已经是最新版本。',
          availableVersion: null,
          downloadPercent: null,
          canCheck: true,
          actionLabel: '检查更新'
        })
        return this.state
      }

      this.setAvailableState(
        metadata.version,
        `发现新版本 ${metadata.version}，将下载 DMG 安装包并引导你手动替换应用。`,
        '下载更新'
      )
      return this.state
    } catch (error) {
      this.setState({
        status: 'error',
        message: error instanceof Error ? error.message : '检查更新失败。',
        availableVersion: null,
        downloadPercent: null,
        canCheck: true,
        actionLabel: '检查更新'
      })
      return this.state
    }
  }

  private async downloadManualMacUpdate(): Promise<UpdateState> {
    if (this.downloadedDmgPath !== null) {
      await this.openDownloadedDmg(this.downloadedDmgPath, this.state.availableVersion)
      return this.state
    }

    const metadata = this.manualMacUpdateInfo
    if (!metadata) {
      return this.state
    }

    this.setState({
      status: 'downloading',
      message: '正在下载 DMG 安装包…',
      availableVersion: metadata.version,
      downloadPercent: null,
      canCheck: false,
      actionLabel: '正在下载…'
    })

    try {
      const response = await net.fetch(metadata.dmgUrl)
      if (!response.ok) {
        throw new Error(`下载更新失败：${response.status}`)
      }

      const downloadDirectory = join(app.getPath('downloads'), MANUAL_DMG_DOWNLOAD_DIR)
      await mkdir(downloadDirectory, { recursive: true })
      const dmgPath = join(downloadDirectory, metadata.fileName)
      const buffer = Buffer.from(await response.arrayBuffer())
      await writeFile(dmgPath, buffer)

      this.downloadedDmgPath = dmgPath
      await this.openDownloadedDmg(dmgPath, metadata.version)
      return this.state
    } catch (error) {
      this.setState({
        status: 'error',
        message: error instanceof Error ? error.message : '下载更新失败。',
        availableVersion: metadata.version,
        downloadPercent: null,
        canCheck: true,
        actionLabel: '下载更新'
      })
      return this.state
    }
  }

  private async openDownloadedDmg(dmgPath: string, version: string | null): Promise<void> {
    const openError = await shell.openPath(dmgPath)
    if (openError) {
      throw new Error(openError)
    }

    this.setState({
      status: 'downloaded',
      message:
        `已打开 ${version ?? '新版本'} 安装包。请在弹出的窗口中将 PetBuddy.app 拖到 Applications 完成替换。`,
      availableVersion: version,
      downloadPercent: 100,
      canCheck: true,
      actionLabel: '打开安装包'
    })
  }

  private setAvailableState(version: string, message: string, actionLabel: string): void {
    this.setState({
      status: 'available',
      message,
      availableVersion: version,
      downloadPercent: null,
      canCheck: true,
      actionLabel
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
