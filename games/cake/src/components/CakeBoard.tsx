import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import type { CakeDefinition, CakePieceModel, InteractionMode, Topping } from '../types/game'
import { toolImages } from '../data/assets'
import { normalizeAngle, polarToCartesian } from '../utils/cakeGeometry'
import { CakePiece } from './CakePiece'
import { CakePieceLabels } from './CakePieceLabels'
import { CuttingGuide } from './CuttingGuide'
import { ToppingLayer } from './ToppingLayer'
import { FuriganaText } from './FuriganaText'

interface CakeBoardProps {
  pieces: CakePieceModel[]
  cake: CakeDefinition
  toppings: Topping[]
  cutToppingIds: string[]
  cutMarkAngles: number[]
  isTrayFull: boolean
  isCarryingPiece: boolean
  interactionMode: InteractionMode
  currentCuts: number
  showCuttingGuide?: boolean
  onCutCake: (cuts: number, cutAngles: number[]) => void
  onMovePieceToTray: (piece: CakePieceModel) => void
  onCarryPieceChange: (
    piece: CakePieceModel,
    position: { x: number; y: number } | null,
  ) => void
}

interface BoardPoint {
  x: number
  y: number
}

interface ToolCursorPosition {
  x: number
  y: number
}

const center = 120
const minimumSwipeLength = 42
const angleTolerance = 24
const centerTolerance = 76
const edgeDistance = 44

const getLineAngleDistance = (left: number, right: number): number => {
  const difference = Math.abs(normalizeAngle(left) - normalizeAngle(right)) % 180
  return Math.min(difference, 180 - difference)
}

const getAngleDistance = (left: number, right: number): number => {
  const difference = Math.abs(normalizeAngle(left) - normalizeAngle(right))
  return Math.min(difference, 360 - difference)
}

const getSvgPoint = (event: PointerEvent<SVGSVGElement>): BoardPoint => {
  const bounds = event.currentTarget.getBoundingClientRect()

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * 240,
    y: ((event.clientY - bounds.top) / bounds.height) * 240,
  }
}

const getSwipeLength = (start: BoardPoint, end: BoardPoint): number =>
  Math.hypot(end.x - start.x, end.y - start.y)

const getSwipeAngle = (start: BoardPoint, end: BoardPoint): number =>
  normalizeAngle((Math.atan2(end.x - start.x, -(end.y - start.y)) * 180) / Math.PI)

const getMidpointDistanceFromCenter = (start: BoardPoint, end: BoardPoint): number => {
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  }

  return Math.hypot(midpoint.x - center, midpoint.y - center)
}

const getDistanceFromCenter = (point: BoardPoint): number => Math.hypot(point.x - center, point.y - center)

const getAngleFromCenter = (point: BoardPoint): number =>
  normalizeAngle((Math.atan2(point.x - center, -(point.y - center)) * 180) / Math.PI)

const getGuideAngles = (cuts: number): number[] =>
  Array.from({ length: cuts }, (_, index) => (360 / cuts) * index)

const getNearestGuideAngle = (cuts: number, angle: number): number => {
  const guideAngles = getGuideAngles(cuts)

  return guideAngles.reduce((nearestAngle, guideAngle) =>
    getLineAngleDistance(angle, guideAngle) < getLineAngleDistance(angle, nearestAngle)
      ? guideAngle
      : nearestAngle,
  )
}

const getNearestRadialGuideAngle = (cuts: number, angle: number): number => {
  const guideAngles = getGuideAngles(cuts)

  return guideAngles.reduce((nearestAngle, guideAngle) =>
    getAngleDistance(angle, guideAngle) < getAngleDistance(angle, nearestAngle)
      ? guideAngle
      : nearestAngle,
  )
}

const isSwipeOnGuide = (cuts: number, start: BoardPoint, end: BoardPoint): boolean => {
  if (getSwipeLength(start, end) < minimumSwipeLength) {
    return false
  }

  if (getMidpointDistanceFromCenter(start, end) > centerTolerance) {
    return false
  }

  const swipeAngle = getSwipeAngle(start, end)
  const guideAngles = getGuideAngles(cuts)

  return guideAngles.some((guideAngle) => getLineAngleDistance(swipeAngle, guideAngle) <= angleTolerance)
}

const getCutAnglesFromSwipe = (cuts: number, start: BoardPoint, end: BoardPoint): number[] => {
  const startDistance = getDistanceFromCenter(start)
  const endDistance = getDistanceFromCenter(end)
  const midpointDistance = getMidpointDistanceFromCenter(start, end)
  const swipeAngle = getSwipeAngle(start, end)
  const isDiameterCut =
    startDistance > edgeDistance && endDistance > edgeDistance && midpointDistance <= centerTolerance

  if (isDiameterCut) {
    const guideAngle = getNearestGuideAngle(cuts, swipeAngle)
    return [guideAngle, guideAngle + 180]
  }

  const farPoint = startDistance >= endDistance ? start : end
  const radialAngle = getAngleFromCenter(farPoint)
  return [getNearestRadialGuideAngle(cuts, radialAngle)]
}

const pendingCutLineRadius = 104

const getPendingCutAngles = (pieces: CakePieceModel[]): number[] =>
  Array.from(new Set(pieces.flatMap((piece) => piece.pendingCutAngles)))

const isCutAngleInsideBoardPiece = (angle: number, pieces: CakePieceModel[]): boolean =>
  pieces.some((piece) => {
    if (piece.endAngle - piece.startAngle >= 359.999) {
      return true
    }

    const normalizedAngle = normalizeAngle(angle)
    const comparableAngle =
      piece.endAngle > 360 && normalizedAngle < piece.startAngle
        ? normalizedAngle + 360
        : normalizedAngle

    return comparableAngle > piece.startAngle + 0.001 && comparableAngle < piece.endAngle - 0.001
  })

export function CakeBoard({
  pieces,
  cake,
  toppings,
  cutToppingIds,
  cutMarkAngles,
  isTrayFull,
  isCarryingPiece,
  interactionMode,
  currentCuts,
  showCuttingGuide = true,
  onCutCake,
  onMovePieceToTray,
  onCarryPieceChange,
}: CakeBoardProps) {
  const [swipeStart, setSwipeStart] = useState<BoardPoint | null>(null)
  const [swipeEnd, setSwipeEnd] = useState<BoardPoint | null>(null)
  const [cutNotice, setCutNotice] = useState('点線に沿って切ろう。小さいピースは外側から中心まででも切れます。')
  const [toolCursorPosition, setToolCursorPosition] = useState<ToolCursorPosition | null>(null)
  const shouldSuppressNextClick = useRef(false)
  const pendingCutAngles = getPendingCutAngles(pieces)

  const handleSurfacePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'touch') {
      setToolCursorPosition(null)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    setToolCursorPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>): void => {
    if (interactionMode !== 'cut') {
      return
    }

    const point = getSvgPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    setSwipeStart(point)
    setSwipeEnd(point)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>): void => {
    if (interactionMode !== 'cut') {
      return
    }

    if (swipeStart === null) {
      return
    }

    setSwipeEnd(getSvgPoint(event))
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>): void => {
    if (interactionMode !== 'cut') {
      setSwipeStart(null)
      setSwipeEnd(null)
      return
    }

    if (swipeStart === null) {
      return
    }

    const end = getSvgPoint(event)
    const swipeLength = getSwipeLength(swipeStart, end)

    setSwipeStart(null)
    setSwipeEnd(null)

    if (swipeLength < minimumSwipeLength) {
      return
    }

    shouldSuppressNextClick.current = true
    window.setTimeout(() => {
      shouldSuppressNextClick.current = false
    }, 0)

    if (isSwipeOnGuide(currentCuts, swipeStart, end)) {
      const validCutAngles = getCutAnglesFromSwipe(currentCuts, swipeStart, end).filter((angle) =>
        isCutAngleInsideBoardPiece(angle, pieces),
      )

      if (validCutAngles.length === 0) {
        setCutNotice('そこにはケーキがありません。')
        return
      }

      onCutCake(currentCuts, validCutAngles)
      return
    }

    setCutNotice('点線に沿って切ってみよう。4分の1などは外側から中心までの短いカットでも作れます。')
  }

  const handleClickCapture = (event: MouseEvent<SVGSVGElement>): void => {
    if (!shouldSuppressNextClick.current) {
      return
    }

    shouldSuppressNextClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section className="cake-board" aria-label="ケーキを切る場所">
      <div
        className="cake-board__surface has-tool-cursor"
        onPointerMove={handleSurfacePointerMove}
        onPointerLeave={() => setToolCursorPosition(null)}
      >
        <svg
          viewBox="0 0 240 240"
          className="cake-svg"
          role="img"
          aria-label="丸いケーキ"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClickCapture={handleClickCapture}
        >
          <defs>
            <pattern
              id={`cake-image-${cake.id}`}
              patternUnits="userSpaceOnUse"
              width="240"
              height="240"
            >
              <image href={cake.imageUrl} x="0" y="0" width="240" height="240" />
            </pattern>
          </defs>
          {pieces.map((piece) => (
            <CakePiece
              key={piece.id}
              piece={piece}
              imageFill={`url(#cake-image-${cake.id})`}
              isTrayFull={isTrayFull}
              canMove={interactionMode === 'move'}
              onMoveToTray={onMovePieceToTray}
              onCarryPieceChange={onCarryPieceChange}
            />
          ))}
          <ToppingLayer toppings={toppings} cutToppingIds={cutToppingIds} pieces={pieces} />
          {cutMarkAngles.map((angle) => {
            const point = polarToCartesian(center, center, pendingCutLineRadius, angle)

            return (
              <g key={angle} className="cut-mark">
                <line
                  x1={center}
                  y1={center}
                  x2={point.x}
                  y2={point.y}
                  className="cut-mark-line cut-mark-line--halo"
                />
                <line
                  x1={center}
                  y1={center}
                  x2={point.x}
                  y2={point.y}
                  className="cut-mark-line"
                />
              </g>
            )
          })}
          {pendingCutAngles.map((angle) => {
            const point = polarToCartesian(center, center, pendingCutLineRadius, angle)

            return (
              <g key={angle} className="pending-cut">
                <line
                  x1={center}
                  y1={center}
                  x2={point.x}
                  y2={point.y}
                  className="pending-cut-line pending-cut-line--halo"
                />
                <line
                  x1={center}
                  y1={center}
                  x2={point.x}
                  y2={point.y}
                  className="pending-cut-line"
                />
                <circle cx={point.x} cy={point.y} r="5.5" className="pending-cut-dot" />
                <circle cx={center} cy={center} r="4.5" className="pending-cut-dot" />
              </g>
            )
          })}
          {interactionMode === 'cut' && showCuttingGuide ? (
            <CuttingGuide cuts={currentCuts} color={cake.guideColor} hiddenAngles={pendingCutAngles} />
          ) : null}
          <CakePieceLabels pieces={pieces} />
          {swipeStart !== null && swipeEnd !== null ? (
            <line
              x1={swipeStart.x}
              y1={swipeStart.y}
              x2={swipeEnd.x}
              y2={swipeEnd.y}
              className="cut-swipe"
            />
          ) : null}
          <circle cx="120" cy="120" r="18" className="cake-center" style={{ fill: cake.centerColor }} />
        </svg>
        {toolCursorPosition !== null && !isCarryingPiece ? (
          <img
            className={`tool-cursor tool-cursor--${interactionMode}`}
            src={toolImages[interactionMode]}
            alt=""
            aria-hidden="true"
            style={{ left: toolCursorPosition.x, top: toolCursorPosition.y }}
          />
        ) : null}
      </div>
      <p className="cake-board__notice">
        <FuriganaText text={cutNotice} />
      </p>
    </section>
  )
}
