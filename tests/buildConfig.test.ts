import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type PackageJson = {
  scripts?: Record<string, string>
  build?: {
    electronDist?: string
    mac?: {
      target?: Array<{
        target?: string
        arch?: string[]
      }>
      icon?: string
      identity?: string | null
      hardenedRuntime?: boolean
      gatekeeperAssess?: boolean
      entitlements?: string
      entitlementsInherit?: string
      notarize?: boolean
    }
    nsis?: {
      include?: string
    }
  }
}

function loadPackageJson(): PackageJson {
  const packageJsonPath = resolve(process.cwd(), 'package.json')
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
}

describe('macOS packaging configuration', () => {
  it('defines a repeatable Apple Silicon DMG build', () => {
    const packageJson = loadPackageJson()

    expect(packageJson.scripts?.package).toContain('--mac')
    expect(packageJson.scripts?.package).toContain('--arm64')
    expect(packageJson.build?.electronDist).toBeUndefined()
    expect(packageJson.build?.mac?.target).toEqual([
      {
        target: 'dmg',
        arch: ['arm64']
      },
      {
        target: 'zip',
        arch: ['arm64']
      }
    ])
  })

  it('configures icon and notarization inputs for macOS release builds', () => {
    const packageJson = loadPackageJson()

    expect(packageJson.build?.mac?.icon).toBe('build/icon.icns')
    expect(packageJson.build?.mac?.identity).toBe('-')
    expect(packageJson.build?.mac?.hardenedRuntime).toBe(true)
    expect(packageJson.build?.mac?.gatekeeperAssess).toBe(false)
    expect(packageJson.build?.mac?.entitlements).toBe('build/entitlements.mac.plist')
    expect(packageJson.build?.mac?.entitlementsInherit).toBe('build/entitlements.mac.inherit.plist')
    expect(packageJson.build?.mac?.notarize).toBe(false)
  })
})

describe('Windows packaging configuration', () => {
  it('uses the shared NSIS include script for install and uninstall customization', () => {
    const packageJson = loadPackageJson()

    expect(packageJson.build?.nsis?.include).toBe('build/installer.nsh')
  })

  it('keeps user data during updates but removes it on manual uninstall', () => {
    const installerScriptPath = resolve(process.cwd(), 'build', 'installer.nsh')
    const installerScript = readFileSync(installerScriptPath, 'utf8')

    expect(installerScript).toContain('!macro customUnInstall')
    expect(installerScript).toContain('${ifNot} ${isUpdated}')
    expect(installerScript).toContain('RMDir /r "$APPDATA\\PetBuddy"')
  })
})
