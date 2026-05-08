import type { PetPosition } from '@shared/types'

export interface MouseDownDragParams {
  button: number
  screenX: number
  screenY: number
  petPosition: PetPosition
}

export const getDragOffsetForMouseDown = ({ button, screenX, screenY, petPosition }: MouseDownDragParams) => {
  if (button !== 0) {
    return null
  }

  return {
    x: screenX - petPosition.x,
    y: screenY - petPosition.y
  }
}
