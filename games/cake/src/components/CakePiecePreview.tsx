import { useId } from 'react'
import type { CakePieceModel, Topping } from '../types/game'
import { toppingImages } from '../data/assets'
import { describeCakeSlice, normalizeAngle, polarToCartesian } from '../utils/cakeGeometry'
import { formatFraction } from '../utils/fraction'

interface CakePiecePreviewProps {
  piece: CakePieceModel
  imageUrl: string
  toppings: Topping[]
  showLabel?: boolean
}

const center = 120
const radius = 104

const toppingSizes = {
  strawberry: 34,
  banana: 38,
  cream: 34,
} as const

const isToppingInPiece = (topping: Topping, piece: CakePieceModel): boolean => {
  const angle = normalizeAngle(topping.angle)

  if (piece.endAngle > 360) {
    const comparableAngle = angle < piece.startAngle ? angle + 360 : angle
    return comparableAngle >= piece.startAngle - 0.001 && comparableAngle <= piece.endAngle + 0.001
  }

  return angle >= piece.startAngle - 0.001 && angle <= piece.endAngle + 0.001
}

export function CakePiecePreview({ piece, imageUrl, toppings, showLabel = true }: CakePiecePreviewProps) {
  const patternId = `piece-preview-${useId().replace(/:/g, '')}`
  const isWholePiece = piece.endAngle - piece.startAngle >= 359.999
  const visibleToppings = toppings.filter((topping) => isToppingInPiece(topping, piece))

  return (
    <span className="cake-piece-preview" aria-label={`ケーキ ${formatFraction(piece.fraction)}`}>
      <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
        <defs>
          <pattern id={patternId} patternUnits="userSpaceOnUse" width="240" height="240">
            <image href={imageUrl} x="0" y="0" width="240" height="240" />
          </pattern>
        </defs>
        {isWholePiece ? (
          <circle cx={center} cy={center} r={radius} fill={`url(#${patternId})`} />
        ) : (
          <path
            d={describeCakeSlice(center, center, radius, piece.startAngle, piece.endAngle)}
            fill={`url(#${patternId})`}
          />
        )}
        {visibleToppings.map((topping) => {
          const point = polarToCartesian(center, center, topping.radius, topping.angle)
          const size = toppingSizes[topping.kind]
          const isCut = piece.cutToppingIds.includes(topping.id)

          return (
            <g key={topping.id} className={isCut ? 'cake-piece-preview__topping is-cut' : 'cake-piece-preview__topping'}>
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
                />
              ) : null}
            </g>
          )
        })}
      </svg>
      {showLabel ? <strong>{formatFraction(piece.fraction)}</strong> : null}
    </span>
  )
}
