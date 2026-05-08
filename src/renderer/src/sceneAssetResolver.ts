import type { RendererPetAppearance } from '@shared/api'
import type { FocusSessionState, PetSceneKey, ReminderEvent } from '@shared/types'

interface ResolveSceneKeyInput {
  activeEvent: ReminderEvent | null
  focusSession: FocusSessionState
  sceneOverride?: PetSceneKey | null
  interactionScene?: PetSceneKey | null
}

const findSceneAsset = (appearance: RendererPetAppearance, scene: PetSceneKey) =>
  appearance.sceneAssets.find((item) => item.scene === scene)

const pickFirst = (values: string[]): string | undefined => values[0]

export const resolveAppearancePreviewAsset = (appearance: RendererPetAppearance): string | undefined => {
  const defaultSceneAsset = findSceneAsset(appearance, 'default')

  if (defaultSceneAsset?.customAsset) {
    return defaultSceneAsset.customAsset
  }

  if (defaultSceneAsset?.defaultAssets.length) {
    return pickFirst(defaultSceneAsset.defaultAssets)
  }

  return pickFirst([...appearance.assets.idle, ...appearance.assets.rest])
}

export const resolveAppearanceCustomizePreviewAsset = (appearance: RendererPetAppearance): string | undefined => {
  const defaultSceneAsset = findSceneAsset(appearance, 'default')

  return defaultSceneAsset?.customAsset ?? undefined
}

export const pickRandomAsset = (values: string[], currentAsset?: string): string | undefined => {
  if (values.length === 0) {
    return undefined
  }

  if (currentAsset && values.includes(currentAsset)) {
    return currentAsset
  }

  return values[Math.floor(Math.random() * values.length)]
}

export const resolvePetSceneKey = ({
  activeEvent,
  focusSession,
  sceneOverride,
  interactionScene
}: ResolveSceneKeyInput): PetSceneKey => {
  if (sceneOverride) {
    return sceneOverride
  }

  if (interactionScene) {
    return interactionScene
  }

  if (activeEvent) {
    switch (activeEvent.kind) {
      case 'break':
        return 'breakPrompt'
      case 'water':
        return 'hydrationPrompt'
      case 'focusNudge':
        return 'focusAlert'
    }
  }

  if (focusSession.status === 'active') {
    return 'focusGuard'
  }

  if (focusSession.status === 'done') {
    return 'focusDone'
  }

  return 'default'
}

export const getPetSceneAssetCandidates = (appearance: RendererPetAppearance, scene: PetSceneKey): string[] => {
  const sceneAsset = findSceneAsset(appearance, scene)
  if (sceneAsset?.customAsset) {
    return [sceneAsset.customAsset]
  }

  if (sceneAsset?.defaultAssets.length) {
    return sceneAsset.defaultAssets
  }

  const defaultSceneAsset = findSceneAsset(appearance, 'default')
  if (defaultSceneAsset?.customAsset) {
    return [defaultSceneAsset.customAsset]
  }

  if (defaultSceneAsset?.defaultAssets.length) {
    return defaultSceneAsset.defaultAssets
  }

  return [...appearance.assets.idle, ...appearance.assets.rest]
}

export const resolvePetSceneAsset = (appearance: RendererPetAppearance, scene: PetSceneKey): string | undefined => {
  const candidates = getPetSceneAssetCandidates(appearance, scene)

  return pickFirst(candidates)
}
