import { useEffect, useRef, type PointerEvent } from 'react'
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
  const cancelCarry = useRef<(() => void) | null>(null)
  useEffect(() => () => cancelCarry.current?.(), [])
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

    if (!event.isPrimary || event.button !== 0) return
    cancelCarry.current?.()
    const pointerId = event.pointerId
    event.preventDefault()
    window.getSelection()?.removeAllRanges()
    onCarryPieceChange(piece, { x: event.clientX, y: event.clientY })

    const cleanup = (): void => {
      document.removeEventListener('pointermove', handleDocumentPointerMove)
      document.removeEventListener('pointerup', handleDocumentPointerUp)
      document.removeEventListener('pointercancel', handleDocumentPointerCancel)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', visibilityChange)
      cancelCarry.current = null
      onCarryPieceChange(piece, null)
    }
    const cancel = (): void => cleanup()
    const visibilityChange = (): void => { if (document.hidden) cancel() }
    const handleDocumentPointerMove = (event: globalThis.PointerEvent): void => {
      if (event.pointerId !== pointerId) return
      if (event.buttons === 0) { cancel(); return }
      onCarryPieceChange(piece, { x: event.clientX, y: event.clientY })
    }
    const handleDocumentPointerUp = (event: globalThis.PointerEvent): void => {
      if (event.pointerId !== pointerId) return
      cleanup()
      const droppedElement = document.elementFromPoint(event.clientX, event.clientY)
      // A missing element means the pointer is outside the game viewport.
      if (droppedElement === null) return
      const tray = document.querySelector('.tray')
      const bounds = tray?.getBoundingClientRect()
      const margin = 64 // Design pixels; scales with the game viewport.
      const nearTray = bounds !== undefined &&
        event.clientX >= bounds.left - margin && event.clientX <= bounds.right + margin &&
        event.clientY >= bounds.top - margin && event.clientY <= bounds.bottom + margin
      const overTray = droppedElement.closest('.tray') !== null
      // Do not treat adjacent controls (e.g. Serve) as drop targets.
      if (overTray || (nearTray && droppedElement.closest('button') === null)) {
        onMoveToTray(piece)
      }
    }
    const handleDocumentPointerCancel = (event: globalThis.PointerEvent): void => {
      if (event.pointerId === pointerId) cancel()
    }
    cancelCarry.current = cancel
    document.addEventListener('pointermove', handleDocumentPointerMove)
    document.addEventListener('pointerup', handleDocumentPointerUp)
    document.addEventListener('pointercancel', handleDocumentPointerCancel)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', visibilityChange)
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
