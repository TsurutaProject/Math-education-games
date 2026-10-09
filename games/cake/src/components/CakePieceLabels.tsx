import type { CakePieceModel } from '../types/game'
import { polarToCartesian } from '../utils/cakeGeometry'
import { formatFraction } from '../utils/fraction'

interface CakePieceLabelsProps {
  pieces: CakePieceModel[]
}

const center = 120
const radius = 104

export function CakePieceLabels({ pieces }: CakePieceLabelsProps) {
  return (
    <g className="cake-piece-labels" aria-hidden="true">
      {pieces.map((piece) => {
        const middleAngle = (piece.startAngle + piece.endAngle) / 2
        const labelPoint = polarToCartesian(center, center, radius * 0.58, middleAngle)

        return (
          <text
            key={piece.id}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {formatFraction(piece.fraction)}
          </text>
        )
      })}
    </g>
  )
}
