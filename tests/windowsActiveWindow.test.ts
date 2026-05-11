import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the native module before importing
const mockGetActiveWindow = vi.fn()
const mockInitialize = vi.fn()

vi.mock('@paymoapp/active-window', () => ({
  default: {
    initialize: mockInitialize,
    getActiveWindow: mockGetActiveWindow
  }
}))

// Mock the require call in windowsActiveWindow.ts
vi.mock('node:module', async () => {
  const actual = await vi.importActual('node:module')
  return {
    ...actual,
    createRequire: () => ({
      resolve: vi.fn(),
      main: undefined,
      extensions: {},
      cache: {}
    })
  }
})

describe('Windows Active Window Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module cache to ensure fresh imports
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('handles initialization gracefully when native module is not available', async () => {
    // This test verifies that the module handles missing native dependencies
    const { getWindowsFrontmostSample } = await import('../src/main/services/windowsActiveWindow')
    
    const sample = await getWindowsFrontmostSample()
    
    expect(sample.appId).toBeNull()
    expect(sample.domain).toBeNull()
  })

  it('returns null when getActiveWindow returns null', async () => {
    mockGetActiveWindow.mockReturnValue(null)
    mockInitialize.mockImplementation(() => {})

    // Force re-import to pick up mocks
    vi.resetModules()
    const { initializeWindowsActiveWindow, getWindowsFrontmostSample } = await import('../src/main/services/windowsActiveWindow')
    
    initializeWindowsActiveWindow()
    const sample = await getWindowsFrontmostSample()

    expect(sample.appId).toBeNull()
    expect(sample.domain).toBeNull()
  })

  it('handles errors during window info retrieval', async () => {
    mockGetActiveWindow.mockImplementation(() => {
      throw new Error('Native module error')
    })
    mockInitialize.mockImplementation(() => {})

    vi.resetModules()
    const { initializeWindowsActiveWindow, getWindowsFrontmostSample } = await import('../src/main/services/windowsActiveWindow')
    
    initializeWindowsActiveWindow()
    const sample = await getWindowsFrontmostSample()

    expect(sample.appId).toBeNull()
    expect(sample.domain).toBeNull()
  })
})
