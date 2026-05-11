import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UpdateCheckResult, ProgressInfo, UpdateDownloadedEvent } from 'electron-updater'

type ListenerMap = Map<string, Set<(...args: any[]) => void>>

const listeners: ListenerMap = new Map()
const checkForUpdates = vi.fn<() => Promise<UpdateCheckResult | null>>()
const downloadUpdate = vi.fn<() => Promise<string[]>>()
const quitAndInstall = vi.fn<() => void>()
const openExternal = vi.fn<() => Promise<void>>()
const openPath = vi.fn<() => Promise<string>>()
const netFetch = vi.fn<(url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> }>>()
const appMock = {
  isPackaged: true,
  getPath: vi.fn((name: string) => {
    if (name === 'downloads') {
      return '/tmp/Downloads'
    }

    return '/tmp'
  }),
}

const autoUpdaterMock = {
  autoDownload: true,
  setFeedURL: vi.fn(),
  on: vi.fn((event: string, listener: (...args: any[]) => void) => {
    const eventListeners = listeners.get(event) ?? new Set()
    eventListeners.add(listener)
    listeners.set(event, eventListeners)
    return autoUpdaterMock
  }),
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
}

const emit = (event: string, payload?: unknown) => {
  for (const listener of listeners.get(event) ?? []) {
    listener(payload)
  }
}

vi.mock('electron-updater', () => ({
  default: {
    autoUpdater: autoUpdaterMock,
  },
}))

vi.mock('electron', () => ({
  app: appMock,
  net: {
    fetch: netFetch,
  },
  shell: {
    openExternal,
    openPath,
  },
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
}))

describe('UpdateService', () => {
  beforeEach(() => {
    listeners.clear()
    autoUpdaterMock.on.mockClear()
    autoUpdaterMock.setFeedURL.mockClear()
    checkForUpdates.mockReset()
    downloadUpdate.mockReset()
    quitAndInstall.mockReset()
    openExternal.mockReset()
    openPath.mockReset()
    netFetch.mockReset()
    appMock.getPath.mockClear()
    appMock.isPackaged = true
    autoUpdaterMock.autoDownload = true
    vi.resetModules()
  })

  it('reports unavailable updates on unsupported runtimes', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'linux',
      arch: 'x64',
    })

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.1.0')

    expect(service.getState()).toEqual({
      status: 'unavailable',
      message: '当前构建不支持应用内更新。',
      currentVersion: '0.1.0',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false,
      actionLabel: '检查更新',
    })
  })

  it('supports updater-driven installs on Windows', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'win32',
      arch: 'x64',
    })
    checkForUpdates.mockResolvedValue({} as UpdateCheckResult)

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.1.0')

    expect(service.getState()).toMatchObject({
      status: 'idle',
      message: '尚未检查更新。',
      currentVersion: '0.1.0',
      canCheck: true,
      actionLabel: '检查更新',
    })

    await service.checkNow()
    emit('update-not-available')

    expect(service.getState()).toMatchObject({
      status: 'not-available',
      message: '已经是最新版本。',
      canCheck: true,
      actionLabel: '检查更新',
    })
  })

  it('reports unavailable updates in unpackaged builds instead of getting stuck in checking', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      arch: 'arm64',
    })
    appMock.isPackaged = false
    checkForUpdates.mockResolvedValue(null)

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.1.0')

    expect(service.getState()).toEqual({
      status: 'unavailable',
      message: '当前构建不支持应用内更新，请使用已打包版本。',
      currentVersion: '0.1.0',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false,
      actionLabel: '检查更新',
    })

    await service.checkNow()

    expect(service.getState()).toEqual({
      status: 'unavailable',
      message: '当前构建不支持应用内更新，请使用已打包版本。',
      currentVersion: '0.1.0',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false,
      actionLabel: '检查更新',
    })
  })

  it('maps updater events into available, downloading, and downloaded states on Windows', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'win32',
      arch: 'x64',
    })
    checkForUpdates.mockResolvedValue({} as UpdateCheckResult)
    downloadUpdate.mockResolvedValue(['/tmp/PetBuddy.zip'])

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.1.0')

    await service.checkNow()
    emit('update-available', { version: '0.2.0' })

    expect(service.getState()).toMatchObject({
      status: 'available',
      availableVersion: '0.2.0',
      canCheck: true,
      actionLabel: '立即更新',
    })

    await service.downloadUpdate()
    emit('download-progress', { percent: 42.4 } satisfies Partial<ProgressInfo>)

    expect(service.getState()).toMatchObject({
      status: 'downloading',
      availableVersion: '0.2.0',
      downloadPercent: 42,
      actionLabel: '正在下载…',
    })

    emit('update-downloaded', { version: '0.2.0' } satisfies Partial<UpdateDownloadedEvent>)

    expect(service.getState()).toMatchObject({
      status: 'downloaded',
      availableVersion: '0.2.0',
      message: '准备安装，应用将重新打开。',
      actionLabel: null,
    })
    expect(quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('downloads and opens a DMG for packaged macOS builds', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      arch: 'arm64',
    })
    netFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `version: 0.2.6
files:
  - url: PetBuddy-0.2.6-arm64-mac.zip
  - url: PetBuddy-0.2.6-arm64.dmg
`,
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
        arrayBuffer: async () => new TextEncoder().encode('dmg').buffer,
      })
    openPath.mockResolvedValue('')

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.2.5')

    await service.checkNow()

    expect(service.getState()).toMatchObject({
      status: 'available',
      availableVersion: '0.2.6',
      actionLabel: '下载更新',
    })

    await service.downloadUpdate()

    expect(netFetch).toHaveBeenNthCalledWith(
      1,
      'https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/latest-mac.yml',
    )
    expect(netFetch).toHaveBeenNthCalledWith(
      2,
      'https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/PetBuddy-0.2.6-arm64.dmg',
    )
    expect(openPath).toHaveBeenCalledWith(
      '/tmp/Downloads/PetBuddy Updates/PetBuddy-0.2.6-arm64.dmg',
    )
    expect(service.getState()).toMatchObject({
      status: 'downloaded',
      availableVersion: '0.2.6',
      downloadPercent: 100,
      canCheck: true,
      actionLabel: '打开安装包',
    })
  })

  it('reopens the downloaded DMG without downloading it again', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      arch: 'arm64',
    })
    netFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => `version: 0.2.6
files:
  - url: PetBuddy-0.2.6-arm64.dmg
`,
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
        arrayBuffer: async () => new TextEncoder().encode('dmg').buffer,
      })
    openPath.mockResolvedValue('')

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.2.5')

    await service.checkNow()
    await service.downloadUpdate()
    await service.downloadUpdate()

    expect(netFetch).toHaveBeenCalledTimes(2)
    expect(openPath).toHaveBeenCalledTimes(2)
  })

  it('notifies subscribers when the state changes', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'win32',
      arch: 'x64',
    })
    checkForUpdates.mockResolvedValue({} as UpdateCheckResult)

    const { UpdateService } = await import('../src/main/services/updateService')
    const service = new UpdateService('0.1.0')
    const listener = vi.fn()
    const unsubscribe = service.onStateChanged(listener)

    await service.checkNow()
    emit('update-not-available')

    expect(listener).toHaveBeenCalled()
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'not-available',
        currentVersion: '0.1.0',
      }),
    )

    unsubscribe()
    emit('error', new Error('late error'))
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
