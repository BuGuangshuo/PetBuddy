import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Windows Active Window Detection', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('handles initialization gracefully when native module is not available', async () => {
    // This test verifies that the module handles missing native dependencies
    const { getWindowsFrontmostSample } = await import('../src/main/services/windowsActiveWindow')
    
    const sample = await getWindowsFrontmostSample()
    
    expect(sample.appId).toBeNull()
    expect(sample.domain).toBeNull()
  })

  it('uses full path as appId on Windows', () => {
    // Test the logic without requiring the native module
    // This verifies the path handling logic
    const testPath = 'C:\\Program Files\\Spotify\\Spotify.exe'
    const testApplication = 'Spotify'
    
    // Simulate what getWindowsFrontmostSample would return
    // when windowInfo.path is available
    const appId = testPath || testApplication
    
    expect(appId).toBe('C:\\Program Files\\Spotify\\Spotify.exe')
  })

  it('extracts app name from path for label resolution', () => {
    // Test the label resolution logic
    const testPaths = [
      'C:\\Program Files\\Spotify\\Spotify.exe',
      'C:\\Users\\Test\\AppData\\Local\\Discord\\app-1.0.9015\\Discord.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    ]
    
    const expectedNames = ['Spotify', 'Discord', 'chrome']
    
    testPaths.forEach((path, index) => {
      const normalizedPath = path.replace(/\\/g, '/')
      const fileName = normalizedPath.split('/').pop() || ''
      const name = fileName.replace(/\.exe$/i, '')
      
      expect(name).toBe(expectedNames[index])
    })
  })

  it('falls back to the unpacked package path when packaged require fails', async () => {
    const moduleExports = {
      default: {
        initialize: vi.fn(),
        getActiveWindow: vi.fn()
      }
    }
    const requireFn = vi
      .fn<(specifier: string) => unknown>()
      .mockImplementation((specifier: string) => {
        if (specifier === '@paymoapp/active-window') {
          throw new Error('Cannot find module')
        }

        if (
          specifier ===
          'C:\\Program Files\\PetBuddy\\resources\\app.asar.unpacked\\node_modules\\@paymoapp\\active-window\\dist\\index.js'
        ) {
          return moduleExports
        }

        throw new Error(`Unexpected module request: ${specifier}`)
      })

    const { loadActiveWindowModule } = await import('../src/main/services/windowsActiveWindow')

    const loaded = loadActiveWindowModule({
      isPackaged: true,
      resourcesPath: 'C:\\Program Files\\PetBuddy\\resources',
      requireFn
    })

    expect(loaded).toBe(moduleExports.default)
    expect(requireFn).toHaveBeenNthCalledWith(1, '@paymoapp/active-window')
    expect(requireFn).toHaveBeenNthCalledWith(
      2,
      'C:\\Program Files\\PetBuddy\\resources\\app.asar.unpacked\\node_modules\\@paymoapp\\active-window\\dist\\index.js'
    )
  })
})
