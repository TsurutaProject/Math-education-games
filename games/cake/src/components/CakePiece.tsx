import type { PointerEvent } from 'react'
import type { CakePieceModel } from '../types/game'
import { describeCakeSlice } from '../utils/cakeGeometry'

interface CakePieceProps {
  piece: CakePieceModel
  imageFill: string
  isTrayFull: boolean
  canMove: boolean
  onMoveToTray: (piece: CakePieceModel) => void
  onCarryPieceChange: (piece: CakePieceModel, position: CarryPosition | null) => void
}

interface CarryPosition {
  x: number
  y: number
}

const center = 120
const radius = 104

export function CakePiece({
  piece,
  imageFill,
  isTrayFull,
  canMove,
  onMoveToTray,
  onCarryPieceChange,
}: CakePieceProps) {
  const middleAngle = (piece.startAngle + piece.endAngle) / 2
  const isWholePiece = piece.endAngle - piece.startAngle >= 359.999
  const offsetAngle = ((middleAngle - 90) * Math.PI) / 180
  const offsetPoint = {
    x: (isWholePiece ? 0 : 4) * Math.cos(offsetAngle),
    y: (isWholePiece ? 0 : 4) * Math.sin(offsetAngle),
  }
  const handlePointerDown = (event: PointerEvent<SVGPathElement>): void => {
    if (!canMove || isTrayFull) {
      return
    }

    event.preventDefault()
    window.getSelection()?.removeAllRanges()
    onCarryPieceChange(piece, { x: event.clientX, y: event.clientY })

    const handleDocumentPointerMove = (event: globalThis.PointerEvent): void => {
      onCarryPieceChange(piece, { x: event.clientX, y: event.clientY })
    }

    const handleDocumentPointerUp = (event: globalThis.PointerEvent): void => {
      document.removeEventListener('pointermove', handleDocumentPointerMove)
      document.removeEventListener('pointercancel', handleDocumentPointerCancel)
      onCarryPieceChange(piece, null)
      const droppedElement = document.elementFromPoint(event.clientX, event.clientY)

      if (droppedElement?.closest('.tray') !== null) {
        onMoveToTray(piece)
      }
    }

    const handleDocumentPointerCancel = (): void => {
      document.removeEventListener('pointermove', handleDocumentPointerMove)
      document.removeEventListener('pointerup', handleDocumentPointerUp)
      onCarryPieceChange(piece, null)
    }

    document.addEventListener('pointermove', handleDocumentPointerMove)
    document.addEventListener('pointerup', handleDocumentPointerUp, { once: true })
    document.addEventListener('pointercancel', handleDocumentPointerCancel, { once: true })
  }

  if (isWholePiece) {
    return (
      <g className="cake-piece">
        <circle cx={center} cy={center} r={radius} fill={imageFill} aria-label="まるごとのケーキ" />
      </g>
    )
  }

  return (
    <g
      className={canMove ? 'cake-piece cake-piece--movable' : 'cake-piece'}
      transform={`translate(${offsetPoint.x} ${offsetPoint.y})`}
    >
      <path
        d={describeCakeSlice(center, center, radius, piece.startAngle, piece.endAngle)}
        fill={imageFill}
        onPointerDown={handlePointerDown}
        aria-label="切ったピース"
      />
    </g>
  )
}
