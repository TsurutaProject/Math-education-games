import { normalizeAngle, polarToCartesian } from '../utils/cakeGeometry'

interface CuttingGuideProps {
  cuts: number
  color: string
  hiddenAngles?: number[]
}

const getAngleDistance = (left: number, right: number): number => {
  const difference = Math.abs(normalizeAngle(left) - normalizeAngle(right))
  return Math.min(difference, 360 - difference)
}

export function CuttingGuide({ cuts, color, hiddenAngles = [] }: CuttingGuideProps) {
  const center = 120
  const radius = 108
  const guideAngles = Array.from({ length: cuts }, (_, index) => (360 / cuts) * index)
    .filter((angle) => !hiddenAngles.some((hiddenAngle) => getAngleDistance(angle, hiddenAngle) < 0.001))

  return (
    <g className="cutting-guide" aria-hidden="true">
      {guideAngles.map((angle) => {
        const point = polarToCartesian(center, center, radius, angle)
        return (
          <line
            key={angle}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            style={{ stroke: color }}
          />
        )
      })}
    </g>
  )
}
