import { describe, expect, test } from 'vitest'
import { getAppearanceById, petAppearances } from '../src/shared/pets'

describe('petAppearances', () => {
  test('line-dog exposes stable sceneGroups for supported scenes', () => {
    const appearance = getAppearanceById('line-dog')

    expect(appearance.sceneGroups.default).toEqual(['idle'])
    expect(appearance.sceneGroups.sit).toEqual(['idle'])
    expect(appearance.sceneGroups.happy).toEqual(['happy'])
    expect(appearance.sceneGroups.breakPrompt).toEqual(['breakPrompt'])
    expect(appearance.sceneGroups.focusAlert).toEqual(['focusAlert'])
  })

  test('both appearances expose the same required scene groups and fallback lookup stays stable', () => {
    const firstAppearance = petAppearances[0]
    const lineDog = getAppearanceById('line-dog')
    const goldenPuppy = getAppearanceById('golden-puppy')
    const fallback = getAppearanceById('missing-id' as never)

    expect(goldenPuppy.sceneGroups).toEqual(lineDog.sceneGroups)
    expect(fallback).toBe(firstAppearance)
  })
})
