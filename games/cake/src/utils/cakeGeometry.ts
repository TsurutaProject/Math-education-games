import type { CakeDefinition, CakePieceModel, Fraction, Topping } from '../types/game'

const palette = ['#f7b267', '#f6ad61', '#f8bb74', '#f4a85c', '#f9c985', '#ef9f58']
const fullCircleDegrees = 360

export const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
): { x: number; y: number } => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

export const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360

const getAngleDistance = (left: number, right: number): number => {
  const difference = Math.abs(normalizeAngle(left) - normalizeAngle(right))
  return Math.min(difference, 360 - difference)
}

export const getCutAngles = (denominator: number): number[] => {
  const angleSize = 360 / denominator
  return Array.from({ length: denominator }, (_, index) => index * angleSize)
}

export const getCutToppingIds = (
  denominator: number,
  toppings: Topping[],
  hitTolerance = 7,
): string[] => {
  const cutAngles = getCutAngles(denominator)

  return toppings
    .filter((topping) =>
      cutAngles.some((cutAngle) => getAngleDistance(cutAngle, topping.angle) <= hitTolerance),
    )
    .map((topping) => topping.id)
}

export const describeCakeSlice = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string => {
  if (endAngle - startAngle >= fullCircleDegrees - 0.001) {
    const top = polarToCartesian(centerX, centerY, radius, 0)
    return [
      `M ${top.x} ${top.y}`,
      `A ${radius} ${radius} 0 1 1 ${top.x - 0.01} ${top.y}`,
      `A ${radius} ${radius} 0 1 1 ${top.x} ${top.y}`,
      'Z',
    ].join(' ')
  }

  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

const unique = (items: string[]): string[] => Array.from(new Set(items))

const uniqueAngles = (angles: number[]): number[] =>
  angles
    .map((angle) => normalizeAngle(angle))
    .reduce<number[]>((currentAngles, angle) => {
      if (currentAngles.some((currentAngle) => isSameAngle(currentAngle, angle))) {
        return currentAngles
      }

      return [...currentAngles, angle]
    }, [])

const isSameAngle = (left: number, right: number): boolean => getAngleDistance(left, right) < 0.001

const getPieceFraction = (startAngle: number, endAngle: number): Fraction => ({
  numerator: Math.round(endAngle - startAngle),
  denominator: fullCircleDegrees,
})

const getPieceColor = (startAngle: number, piecePalette = palette): string => {
  const index = Math.floor(normalizeAngle(startAngle) / 60)

  return piecePalette[index % piecePalette.length]
}

const isWholePiece = (piece: CakePieceModel): boolean =>
  piece.endAngle - piece.startAngle >= fullCircleDegrees - 0.001

const getAngleInPieceRange = (angle: number, piece: CakePieceModel): number => {
  const normalized = normalizeAngle(angle)

  if (piece.endAngle <= fullCircleDegrees) {
    return normalized
  }

  return normalized < piece.startAngle ? normalized + fullCircleDegrees : normalized
}

const getCutToppingIdsForAngles = (
  cutAngles: number[],
  toppings: Topping[],
  hitTolerance = 7,
): string[] =>
  toppings
    .filter((topping) =>
      cutAngles.some((angle) => getAngleDistance(angle, topping.angle) <= hitTolerance),
    )
    .map((topping) => topping.id)

const createPieceFromAngles = (
  startAngle: number,
  endAngle: number,
  cutBatch: number,
  sourceId: string,
  index: number,
  cutToppingIds: string[],
  piecePalette: string[],
): CakePieceModel => ({
  id: `cut-${cutBatch}-${sourceId}-${index}`,
  fraction: getPieceFraction(startAngle, endAngle),
  cutDenominator: Math.round(fullCircleDegrees / (endAngle - startAngle)),
  startAngle,
  endAngle,
  color: getPieceColor(startAngle, piecePalette),
  cutToppingIds,
  pendingCutAngles: [],
})

export const createWholeCakePiece = (cake?: CakeDefinition): CakePieceModel => ({
  id: 'whole-cake',
  fraction: { numerator: 1, denominator: 1 },
  cutDenominator: 1,
  startAngle: 0,
  endAngle: fullCircleDegrees,
  color: cake?.baseColor ?? '#f7b267',
  cutToppingIds: [],
  pendingCutAngles: [],
})

export const createCakePieces = (denominator: number, toppings: Topping[]): CakePieceModel[] => {
  const angleSize = 360 / denominator
  const cutToppingIds = getCutToppingIds(denominator, toppings)

  return Array.from({ length: denominator }, (_, index) => {
    const fraction: Fraction = { numerator: 1, denominator }

    return {
      id: `${denominator}-${index}`,
      fraction,
      cutDenominator: denominator,
      startAngle: index * angleSize,
      endAngle: (index + 1) * angleSize,
      color: palette[index % palette.length],
      cutToppingIds,
      pendingCutAngles: [],
    }
  })
}

export const cutCakePieces = (
  pieces: CakePieceModel[],
  cutAngles: number[],
  toppings: Topping[],
  cutBatch: number,
  cake?: CakeDefinition,
): CakePieceModel[] => {
  const normalizedCutAngles = uniqueAngles(cutAngles)

  return pieces.flatMap((piece) => {
    const freshCutToppingIds = getCutToppingIdsForAngles(normalizedCutAngles, toppings)

    if (isWholePiece(piece)) {
      const pendingCutAngles = uniqueAngles([...piece.pendingCutAngles, ...normalizedCutAngles]).sort(
        (left, right) => left - right,
      )

      if (pendingCutAngles.length < 2) {
        return [
          {
            ...piece,
            cutToppingIds: unique([...piece.cutToppingIds, ...freshCutToppingIds]),
            pendingCutAngles,
          },
        ]
      }

      return pendingCutAngles.map((startAngle, index) => {
        const nextAngle = pendingCutAngles[(index + 1) % pendingCutAngles.length]
        const endAngle = index === pendingCutAngles.length - 1 ? nextAngle + fullCircleDegrees : nextAngle

        return createPieceFromAngles(
          startAngle,
          endAngle,
          cutBatch,
          piece.id,
          index,
          unique([...piece.cutToppingIds, ...freshCutToppingIds]),
          cake?.palette ?? palette,
        )
      })
    }

    const innerCutAngles = normalizedCutAngles
      .map((angle) => getAngleInPieceRange(angle, piece))
      .filter((angle) => !isSameAngle(angle, piece.startAngle) && !isSameAngle(angle, piece.endAngle))
      .filter((angle) => angle > piece.startAngle + 0.001 && angle < piece.endAngle - 0.001)
      .sort((left, right) => left - right)

    if (innerCutAngles.length === 0) {
      return freshCutToppingIds.length === 0
        ? [piece]
        : [
            {
              ...piece,
              cutToppingIds: unique([...piece.cutToppingIds, ...freshCutToppingIds]),
            },
          ]
    }

    const splitAngles = [piece.startAngle, ...innerCutAngles, piece.endAngle]

    return splitAngles.slice(0, -1).map((startAngle, index) => {
      const endAngle = splitAngles[index + 1]

      return createPieceFromAngles(
        startAngle,
        endAngle,
        cutBatch,
        piece.id,
        index,
        unique([...piece.cutToppingIds, ...freshCutToppingIds]),
        cake?.palette ?? palette,
      )
    })
  })
}
