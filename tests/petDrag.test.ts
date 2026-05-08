import { describe, expect, it } from 'vitest'
import { getDragOffsetForMouseDown } from '../src/renderer/src/pet-drag'

describe('getDragOffsetForMouseDown', () => {
  it('returns null for right click', () => {
    expect(
      getDragOffsetForMouseDown({
        button: 2,
        screenX: 180,
        screenY: 220,
        petPosition: { x: 100, y: 120 }
      })
    ).toBeNull()
  })

  it('returns drag offset for left click', () => {
    expect(
      getDragOffsetForMouseDown({
        button: 0,
        screenX: 180,
        screenY: 220,
        petPosition: { x: 100, y: 120 }
      })
    ).toEqual({ x: 80, y: 100 })
  })
})
