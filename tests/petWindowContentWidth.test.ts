import { describe, expect, it } from 'vitest'

import { getPetWindowContentWidth } from '../src/renderer/src/petWindowContentWidth'

describe('getPetWindowContentWidth', () => {
  it('shrinks back to the base width after a wider reminder disappears', () => {
    const width = getPetWindowContentWidth({
      baseWidth: 176,
      stageRect: {
        left: 0,
        right: 248
      },
      contentRects: [
        {
          left: 36,
          right: 212
        }
      ]
    })

    expect(width).toBe(176)
  })

  it('expands to fit wider reminder content', () => {
    const width = getPetWindowContentWidth({
      baseWidth: 176,
      stageRect: {
        left: 0,
        right: 176
      },
      contentRects: [
        {
          left: -36,
          right: 212
        }
      ]
    })

    expect(width).toBe(248)
  })
})
