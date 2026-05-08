import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createPetCatalog, LOCAL_ASSET_PROTOCOL, pickStableGif } from '../src/main/services/petCatalog'

const createGif = (directory: string, filename: string): void => {
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, filename), 'gif')
}

describe('petCatalog', () => {
  afterEach(() => {
    // No explicit cleanup required for tmp test fixtures.
  })

  test('pickStableGif returns the first sorted gif filename', () => {
    expect(pickStableGif(['b.gif', 'a.gif', 'c.gif'])).toBe('a.gif')
    expect(pickStableGif([])).toBeNull()
  })

  test('builds scene default candidate lists and preserves custom scene gifs', () => {
    const assetRoot = mkdtempSync(join(tmpdir(), 'petbuddy-catalog-'))
    createGif(join(assetRoot, 'line-dog', 'idle'), 'z-idle.gif')
    createGif(join(assetRoot, 'line-dog', 'idle'), 'a-idle.gif')
    createGif(join(assetRoot, 'line-dog', 'happy'), 'happy.gif')
    createGif(join(assetRoot, 'golden-puppy', 'idle'), 'default.gif')

    const appearances = createPetCatalog(assetRoot, undefined, {
      'line-dog': {
        happy: '/tmp/custom-happy.gif'
      },
      'golden-puppy': {}
    })

    const lineDog = appearances.find((appearance) => appearance.id === 'line-dog')

    expect(lineDog?.assets.idle).toHaveLength(2)
    expect(lineDog?.sceneAssets.find((scene) => scene.scene === 'default')).toMatchObject({
      scene: 'default',
      required: true,
      defaultAssets: [
        `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(join(assetRoot, 'line-dog', 'idle', 'a-idle.gif'))}`,
        `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(join(assetRoot, 'line-dog', 'idle', 'z-idle.gif'))}`
      ],
      customAsset: null
    })
    expect(lineDog?.sceneAssets.find((scene) => scene.scene === 'happy')).toMatchObject({
      scene: 'happy',
      required: false,
      defaultAssets: [
        `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(join(assetRoot, 'line-dog', 'happy', 'happy.gif'))}`
      ],
      customAsset: `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent('/tmp/custom-happy.gif')}`
    })
  })

  test('uses file URLs for custom scene gifs even when a renderer base URL exists', () => {
    const assetRoot = mkdtempSync(join(tmpdir(), 'petbuddy-catalog-'))
    createGif(join(assetRoot, 'line-dog', 'idle'), 'idle.gif')

    const customPath = join(tmpdir(), 'petbuddy-custom-focus-guard.gif')
    writeFileSync(customPath, 'gif')

    const appearances = createPetCatalog(assetRoot, 'http://127.0.0.1:5173', {
      'line-dog': {
        focusGuard: customPath
      },
      'golden-puppy': {}
    })

    const focusGuard = appearances
      .find((appearance) => appearance.id === 'line-dog')
      ?.sceneAssets.find((scene) => scene.scene === 'focusGuard')

    expect(focusGuard?.customAsset).toBe(
      `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(customPath)}`
    )
  })

  test('uses the local asset protocol for built-in scene assets', () => {
    const assetRoot = mkdtempSync(join(tmpdir(), 'petbuddy-catalog-'))
    createGif(join(assetRoot, 'line-dog', 'idle'), 'idle.gif')
    createGif(join(assetRoot, 'golden-puppy', 'idle'), 'default.gif')

    const appearances = createPetCatalog(assetRoot)
    const defaultScene = appearances
      .find((appearance) => appearance.id === 'line-dog')
      ?.sceneAssets.find((scene) => scene.scene === 'default')

    expect(defaultScene?.defaultAssets[0]).toBe(
      `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(join(assetRoot, 'line-dog', 'idle', 'idle.gif'))}`
    )
  })
})
