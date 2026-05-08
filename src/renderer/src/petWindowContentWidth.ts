interface HorizontalRect {
  left: number
  right: number
}

interface GetPetWindowContentWidthOptions {
  baseWidth: number
  stageRect: HorizontalRect
  contentRects: HorizontalRect[]
}

export const getPetWindowContentWidth = ({
  baseWidth,
  stageRect,
  contentRects
}: GetPetWindowContentWidthOptions): number => {
  const stageCenterX = (stageRect.left + stageRect.right) / 2
  let maxDistanceFromCenter = baseWidth / 2

  contentRects.forEach((rect) => {
    maxDistanceFromCenter = Math.max(
      maxDistanceFromCenter,
      Math.abs(rect.left - stageCenterX),
      Math.abs(rect.right - stageCenterX)
    )
  })

  return Math.max(baseWidth, Math.ceil(maxDistanceFromCenter * 2))
}
