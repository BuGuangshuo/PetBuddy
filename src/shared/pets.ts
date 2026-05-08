import type { PetAppearance } from './types'

const sharedSceneGroups = {
  default: ['idle'],
  sit: ['idle'],
  happy: ['happy'],
  breakPrompt: ['breakPrompt'],
  breakRunning: ['breakRunning'],
  breakDone: ['breakDone'],
  hydrationPrompt: ['hydrationPrompt'],
  drinking: ['drinking'],
  hydrationDone: ['hydrationDone'],
  focusGuard: ['focusGuard'],
  focusAlert: ['focusAlert'],
  focusDone: ['focusDone'],
  sad: ['sad'],
  sleeping: ['sleeping']
} as const satisfies PetAppearance['sceneGroups']

export const petAppearances: PetAppearance[] = [
  {
    id: 'line-dog',
    displayName: 'Line Dog',
    defaultScale: 1,
    assets: {
      idle: ['idle'],
      run: ['breakRunning'],
      nudge: ['focusAlert', 'focusGuard'],
      drink: ['drinking', 'hydrationPrompt'],
      rest: ['sleeping']
    },
    sceneGroups: sharedSceneGroups
  },
  {
    id: 'golden-puppy',
    displayName: 'Golden Puppy',
    defaultScale: 1,
    assets: {
      idle: ['idle'],
      run: ['breakRunning'],
      nudge: ['focusAlert', 'focusGuard'],
      drink: ['drinking', 'hydrationPrompt'],
      rest: ['sleeping']
    },
    sceneGroups: sharedSceneGroups
  }
]

export const getAppearanceById = (id: PetAppearance['id']): PetAppearance =>
  petAppearances.find((appearance) => appearance.id === id) ?? petAppearances[0]
