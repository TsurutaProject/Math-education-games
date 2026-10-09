import type { CakePieceModel, Topping } from '../types/game'
import { toppingImages } from '../data/assets'
import { normalizeAngle, polarToCartesian } from '../utils/cakeGeometry'

interface ToppingLayerProps {
  toppings: Topping[]
  cutToppingIds: string[]
  pieces: CakePieceModel[]
}

const center = 120

const toppingSizes = {
  strawberry: 34,
  banana: 38,
  cream: 34,
} as const

const isToppingOnBoard = (topping: Topping, pieces: CakePieceModel[]): boolean =>
  pieces.some((piece) => {
    const angle = normalizeAngle(topping.angle)
    const pieceEndAngle = piece.endAngle

    if (pieceEndAngle > 360) {
      const comparableAngle = angle < piece.startAngle ? angle + 360 : angle
      return comparableAngle >= piece.startAngle - 0.001 && comparableAngle <= pieceEndAngle + 0.001
    }

    return angle >= piece.startAngle - 0.001 && angle <= pieceEndAngle + 0.001
  })

export function ToppingLayer({ toppings, cutToppingIds, pieces }: ToppingLayerProps) {
  return (
    <g className="topping-layer" aria-label="トッピング">
      {toppings.filter((topping) => isToppingOnBoard(topping, pieces)).map((topping) => {
        const point = polarToCartesian(center, center, topping.radius, topping.angle)
        const isCut = cutToppingIds.includes(topping.id)

        const size = toppingSizes[topping.kind]
        return (
          <g
            key={topping.id}
            className={isCut ? 'topping topping--cut' : 'topping'}
            aria-label={topping.label}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r={size / 2 + 8}
              className="topping-focus-ring"
            />
            <image
              href={toppingImages[topping.kind]}
              x={point.x - size / 2}
              y={point.y - size / 2}
              width={size}
              height={size}
              preserveAspectRatio="xMidYMid meet"
            />
            {isCut ? (
              <line
                x1={point.x - size / 2}
                y1={point.y - size / 2}
                x2={point.x + size / 2}
                y2={point.y + size / 2}
                className="topping__cut-line"
              />
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
