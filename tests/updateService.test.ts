import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UpdateCheckResult, ProgressInfo, UpdateDownloadedEvent } from 'electron-updater'

type ListenerMap = Map<string, Set<(...args: any[]) => void>>

const listeners: ListenerMap = new Map()
const checkForUpdates = vi.fn<() => Promise<UpdateCheckResult | null>>()
const downloadUpdate = vi.fn<() => Promise<string[]>>()
const quitAndInstall = vi.fn<() => void>()
const openExternal = vi.fn<() => Promise<void>>()
const appMock = {
  isPackaged: true,
}

const autoUpdaterMock = {
  autoDownload: true,
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
  shell: {
    openExternal,
  },
}))

describe('UpdateService', () => {
  beforeEach(() => {
    listeners.clear()
    autoUpdaterMock.on.mockClear()
    checkForUpdates.mockReset()
    downloadUpdate.mockReset()
    quitAndInstall.mockReset()
    openExternal.mockReset()
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
    })
  })

  it('supports updates on Windows platform', async () => {
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
    })

    await service.checkNow()
    emit('update-not-available')

    expect(service.getState()).toMatchObject({
      status: 'not-available',
      message: '已经是最新版本。',
      canCheck: true,
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
    })

    await service.checkNow()

    expect(service.getState()).toEqual({
      status: 'unavailable',
      message: '当前构建不支持应用内更新，请使用已打包版本。',
      currentVersion: '0.1.0',
      availableVersion: null,
      downloadPercent: null,
      canCheck: false,
    })
  })

  it('maps updater events into available, downloading, and downloaded states', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      arch: 'arm64',
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
    })

    await service.downloadUpdate()
    emit('download-progress', { percent: 42.4 } satisfies Partial<ProgressInfo>)

    expect(service.getState()).toMatchObject({
      status: 'downloading',
      availableVersion: '0.2.0',
      downloadPercent: 42,
    })

    emit('update-downloaded', { version: '0.2.0' } satisfies Partial<UpdateDownloadedEvent>)

    expect(service.getState()).toMatchObject({
      status: 'downloaded',
      availableVersion: '0.2.0',
      message: '准备安装，应用将重新打开。',
    })
    expect(quitAndInstall).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers when the state changes', async () => {
    vi.stubGlobal('process', {
      ...process,
      platform: 'darwin',
      arch: 'arm64',
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
