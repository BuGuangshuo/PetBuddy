import { describe, expect, test } from 'vitest'
import type { RendererPetAppearance } from '@shared/api'
import type { FocusSessionState, ReminderEvent } from '@shared/types'
import {
  getPetSceneAssetCandidates,
  pickRandomAsset,
  resolveAppearanceCustomizePreviewAsset,
  resolveAppearancePreviewAsset,
  resolvePetSceneAsset,
  resolvePetSceneKey
} from '../src/renderer/src/sceneAssetResolver'

const appearance: RendererPetAppearance = {
  id: 'line-dog',
  displayName: '线条狗',
  defaultScale: 1,
  assets: {
    idle: ['idle-1.gif', 'idle-2.gif'],
    run: ['run-1.gif'],
    nudge: ['nudge-1.gif'],
    drink: ['drink-1.gif'],
    rest: ['rest-1.gif']
  },
  sceneGroups: {
    default: ['idle'],
    sit: [],
    happy: [],
    breakPrompt: ['breakPrompt'],
    breakRunning: [],
    breakDone: [],
    hydrationPrompt: ['hydrationPrompt'],
    drinking: [],
    hydrationDone: [],
    focusGuard: ['focusGuard'],
    focusAlert: ['focusAlert'],
    focusDone: ['focusDone'],
    sad: [],
    sleeping: []
  },
  sceneAssets: [
    {
      scene: 'default',
      label: '默认待机',
      description: '默认',
      required: true,
      defaultAssets: ['scene-default.gif', 'scene-default-2.gif'],
      customAsset: null
    },
    {
      scene: 'breakPrompt',
      label: '休息提醒',
      description: '休息',
      required: false,
      defaultAssets: ['scene-break.gif'],
      customAsset: 'custom-break.gif'
    },
    {
      scene: 'hydrationPrompt',
      label: '喝水提醒',
      description: '喝水',
      required: false,
      defaultAssets: ['scene-water.gif', 'scene-water-2.gif'],
      customAsset: null
    },
    {
      scene: 'focusAlert',
      label: '专注提醒',
      description: '提醒',
      required: false,
      defaultAssets: ['scene-focus-alert.gif'],
      customAsset: null
    },
    {
      scene: 'focusGuard',
      label: '专注守护',
      description: '守护',
      required: false,
      defaultAssets: ['scene-focus-guard.gif'],
      customAsset: null
    },
    {
      scene: 'focusDone',
      label: '专注完成',
      description: '完成',
      required: false,
      defaultAssets: ['scene-focus-done.gif'],
      customAsset: null
    }
  ]
}

const makeReminder = (kind: ReminderEvent['kind']): ReminderEvent => ({
  id: `${kind}-1`,
  kind,
  message: kind,
  durationMs: 5_000,
  animation: kind === 'break' ? 'run' : kind === 'water' ? 'drink' : 'nudge',
  priority: 1,
  timestamp: 0
})

const makeFocusSession = (status: FocusSessionState['status']): FocusSessionState => ({
  status,
  session: status === 'active' ? { startedAt: 0, endsAt: 1_000 } : null,
  doneEndsAt: status === 'done' ? 1_000 : null,
  pausedRemainingMs: status === 'paused' ? 60_000 : null
})

describe('resolvePetSceneKey', () => {
  test('maps first-pass runtime states to concrete scene keys', () => {
    expect(resolvePetSceneKey({ activeEvent: null, focusSession: makeFocusSession('idle') })).toBe('default')
    expect(resolvePetSceneKey({ activeEvent: makeReminder('break'), focusSession: makeFocusSession('idle') })).toBe('breakPrompt')
    expect(resolvePetSceneKey({ activeEvent: makeReminder('water'), focusSession: makeFocusSession('idle') })).toBe('hydrationPrompt')
    expect(resolvePetSceneKey({ activeEvent: makeReminder('focusNudge'), focusSession: makeFocusSession('idle') })).toBe('focusAlert')
    expect(resolvePetSceneKey({ activeEvent: null, focusSession: makeFocusSession('active') })).toBe('focusGuard')
    expect(resolvePetSceneKey({ activeEvent: null, focusSession: makeFocusSession('done') })).toBe('focusDone')
  })

  test('prefers an explicit interaction scene over reminders and focus states', () => {
    expect(
      resolvePetSceneKey({
        activeEvent: makeReminder('water'),
        focusSession: makeFocusSession('active'),
        interactionScene: 'sad'
      })
    ).toBe('sad')

    expect(
      resolvePetSceneKey({
        activeEvent: null,
        focusSession: makeFocusSession('done'),
        interactionScene: 'drinking'
      })
    ).toBe('drinking')
  })

  test('prefers an explicit scene override over reminders and focus states', () => {
    expect(
      resolvePetSceneKey({
        activeEvent: makeReminder('water'),
        focusSession: makeFocusSession('done'),
        sceneOverride: 'focusDone'
      })
    ).toBe('focusDone')
  })
})

describe('resolvePetSceneAsset', () => {
  test('prefers custom asset over default asset for the resolved scene', () => {
    expect(resolvePetSceneAsset(appearance, 'breakPrompt')).toBe('custom-break.gif')
  })

  test('returns all built-in scene candidates when no custom asset exists', () => {
    expect(getPetSceneAssetCandidates(appearance, 'hydrationPrompt')).toEqual(['scene-water.gif', 'scene-water-2.gif'])
  })

  test('falls back to the default scene asset when the resolved scene has no asset', () => {
    expect(resolvePetSceneAsset(appearance, 'happy')).toBe('scene-default.gif')
  })

  test('keeps settings preview on the built-in default asset when a custom default exists', () => {
    const withCustomDefault: RendererPetAppearance = {
      ...appearance,
      sceneAssets: appearance.sceneAssets.map((sceneAsset) =>
        sceneAsset.scene === 'default'
          ? { ...sceneAsset, customAsset: 'custom-default.gif' }
          : sceneAsset
      )
    }

    expect(resolveAppearancePreviewAsset(withCustomDefault)).toBe('scene-default.gif')
  })

  test('uses the uploaded default scene asset for the customize-card preview', () => {
    const withCustomDefault: RendererPetAppearance = {
      ...appearance,
      sceneAssets: appearance.sceneAssets.map((sceneAsset) =>
        sceneAsset.scene === 'default'
          ? { ...sceneAsset, customAsset: 'custom-default.gif' }
          : sceneAsset
      )
    }

    expect(resolveAppearanceCustomizePreviewAsset(withCustomDefault)).toBe('custom-default.gif')
  })

  test('returns no customize-card preview when the default scene has no uploaded asset', () => {
    expect(resolveAppearanceCustomizePreviewAsset(appearance)).toBeUndefined()
  })

  test('pickRandomAsset keeps the current asset when it is still a valid candidate', () => {
    expect(pickRandomAsset(['a.gif', 'b.gif'], 'b.gif')).toBe('b.gif')
  })

  test('pickRandomAsset chooses one candidate when there is no current asset', () => {
    const result = pickRandomAsset(['a.gif', 'b.gif'])

    expect(['a.gif', 'b.gif']).toContain(result)
  })

  test('falls back to idle or rest assets when even the default scene asset is missing', () => {
    const withoutSceneDefaults: RendererPetAppearance = {
      ...appearance,
      sceneAssets: appearance.sceneAssets.map((sceneAsset) =>
        sceneAsset.scene === 'default'
          ? { ...sceneAsset, defaultAssets: [] }
          : sceneAsset.scene === 'hydrationPrompt'
            ? { ...sceneAsset, defaultAssets: [], customAsset: null }
            : sceneAsset
      )
    }

    expect(resolvePetSceneAsset(withoutSceneDefaults, 'hydrationPrompt')).toBe('idle-1.gif')

    const withoutIdle: RendererPetAppearance = {
      ...withoutSceneDefaults,
      assets: {
        ...withoutSceneDefaults.assets,
        idle: [],
        rest: ['rest-fallback.gif']
      }
    }

    expect(resolvePetSceneAsset(withoutIdle, 'hydrationPrompt')).toBe('rest-fallback.gif')
  })
})
