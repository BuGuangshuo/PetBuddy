import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const readNormalizedSource = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8')
    .replaceAll('"', "'")
    .replace(/\s+/g, ' ')

describe('main process activation behavior', () => {
  it('does not open settings on app activation', () => {
    const source = readNormalizedSource('src/main/index.ts')

    expect(source).not.toContain("app.on('activate'")
    expect(source).not.toContain('windows.shouldShowSettingsOnActivate()')
  })

  it('resolves built-in pet assets from the packaged app path', () => {
    const source = readNormalizedSource('src/main/index.ts')

    expect(source).toContain("join(app.getAppPath(), 'pet_assets')")
    expect(source).not.toContain("join(process.resourcesPath, 'pet_assets')")
  })

  it('disables the macOS safe storage keychain prompt at startup', () => {
    const source = readNormalizedSource('src/main/index.ts')

    expect(source).toContain("app.commandLine.appendSwitch('use-mock-keychain')")
  })

  it('moves the pet to the primary screen bottom-right on first launch before creating the window', () => {
    const source = readNormalizedSource('src/main/index.ts')

    expect(source).toContain('if (store.isFirstLaunch())')
    expect(source).toContain('store.updateSettings({ petPosition: windows.getDefaultPetPosition() })')
    expect(source).toContain('windows.createPetWindow(store.getSettings().petPosition)')
  })
})
