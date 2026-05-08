import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { RendererPetAppearance, RendererSceneAsset } from '@shared/api'
import { petAppearances } from '@shared/pets'
import type { CustomSceneGifMap, PetSceneKey } from '@shared/types'

export const LOCAL_ASSET_PROTOCOL = 'petbuddy-asset'

const sceneDefinitions: ReadonlyArray<Pick<RendererSceneAsset, 'scene' | 'label' | 'description' | 'required'>> = [
  { scene: 'default', label: '默认待机', description: '日常陪伴时显示的基础动作。', required: true },
  { scene: 'sit', label: '坐下', description: '安静坐着等待时使用。', required: false },
  { scene: 'happy', label: '开心', description: '奖励或完成后开心展示。', required: false },
  { scene: 'breakPrompt', label: '休息提醒', description: '提示该起来活动一下。', required: false },
  { scene: 'breakRunning', label: '休息中', description: '进入活动或跑动状态时使用。', required: false },
  { scene: 'breakDone', label: '休息完成', description: '休息结束后的收尾动作。', required: false },
  { scene: 'hydrationPrompt', label: '喝水提醒', description: '提示补充水分时使用。', required: false },
  { scene: 'drinking', label: '喝水中', description: '正在喝水时播放。', required: false },
  { scene: 'hydrationDone', label: '喝水完成', description: '喝水完成后的反馈动作。', required: false },
  { scene: 'focusGuard', label: '专注守护', description: '保持专注时的守护状态。', required: false },
  { scene: 'focusAlert', label: '专注提醒', description: '检测分心后的提醒动作。', required: false },
  { scene: 'focusDone', label: '专注完成', description: '一段专注结束后的反馈。', required: false },
  { scene: 'sad', label: '失落', description: '需要弱反馈时使用。', required: false },
  { scene: 'sleeping', label: '睡觉', description: '休息或暂停时显示。', required: false }
]

const toRendererAssetUrl = (absolutePath: string, rendererBaseUrl?: string): string => {
  void rendererBaseUrl
  return `${LOCAL_ASSET_PROTOCOL}://asset?path=${encodeURIComponent(absolutePath)}`
}

interface GifFileEntry {
  fileName: string
  assetUrl: string
}

const listGifFiles = (directory: string, rendererBaseUrl?: string): GifFileEntry[] => {
  try {
    return readdirSync(directory)
      .filter((entry) => entry.toLowerCase().endsWith('.gif'))
      .sort((left, right) => left.localeCompare(right))
      .map((entry) => ({
        fileName: entry,
        assetUrl: toRendererAssetUrl(join(directory, entry), rendererBaseUrl)
      }))
  } catch {
    return []
  }
}

export const pickStableGif = (files: string[]): string | null =>
  [...files].sort((left, right) => left.localeCompare(right))[0] ?? null

const resolveSceneDefaultAssets = (
  assetRoot: string,
  appearanceId: string,
  groups: readonly string[],
  rendererBaseUrl?: string
): string[] =>
  groups.flatMap((group) =>
    listGifFiles(join(assetRoot, appearanceId, group), rendererBaseUrl).map((asset) => asset.assetUrl)
  )

const resolveCustomSceneAsset = (
  customSceneGifs: CustomSceneGifMap | undefined,
  appearanceId: string,
  scene: PetSceneKey,
  rendererBaseUrl?: string
): string | null => {
  const absolutePath = customSceneGifs?.[appearanceId as keyof CustomSceneGifMap]?.[scene]

  return typeof absolutePath === 'string' ? toRendererAssetUrl(absolutePath, rendererBaseUrl) : null
}

export const createPetCatalog = (
  assetRoot: string,
  rendererBaseUrl?: string,
  customSceneGifs?: CustomSceneGifMap
): RendererPetAppearance[] =>
  petAppearances.map((appearance) => ({
    ...appearance,
    assets: {
      idle: appearance.assets.idle.flatMap((group) =>
        listGifFiles(join(assetRoot, appearance.id, group), rendererBaseUrl).map((asset) => asset.assetUrl)
      ),
      run: appearance.assets.run.flatMap((group) =>
        listGifFiles(join(assetRoot, appearance.id, group), rendererBaseUrl).map((asset) => asset.assetUrl)
      ),
      nudge: appearance.assets.nudge.flatMap((group) =>
        listGifFiles(join(assetRoot, appearance.id, group), rendererBaseUrl).map((asset) => asset.assetUrl)
      ),
      drink: appearance.assets.drink.flatMap((group) =>
        listGifFiles(join(assetRoot, appearance.id, group), rendererBaseUrl).map((asset) => asset.assetUrl)
      ),
      rest: appearance.assets.rest.flatMap((group) =>
        listGifFiles(join(assetRoot, appearance.id, group), rendererBaseUrl).map((asset) => asset.assetUrl)
      )
    },
    sceneAssets: sceneDefinitions.map((scene) => ({
      ...scene,
      defaultAssets: resolveSceneDefaultAssets(
        assetRoot,
        appearance.id,
        appearance.sceneGroups[scene.scene],
        rendererBaseUrl
      ),
      customAsset: resolveCustomSceneAsset(customSceneGifs, appearance.id, scene.scene, rendererBaseUrl)
    }))
  }))
