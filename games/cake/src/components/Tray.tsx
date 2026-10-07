import type { DragEvent } from 'react'
import type { CakePieceModel, Fraction, Topping } from '../types/game'
import { toPercent } from '../utils/fraction'
import { CakePiecePreview } from './CakePiecePreview'
import { FuriganaText } from './FuriganaText'

interface TrayProps {
  selectedPieces: CakePieceModel[]
  total: Fraction
  maxPieces: number
  cakeImageUrl: string
  toppings: Topping[]
  onRemovePiece: (piece: CakePieceModel) => void
  onDropPiece: (pieceId: string) => void
}

export function Tray({ selectedPieces, total, maxPieces, cakeImageUrl, toppings, onRemovePiece, onDropPiece }: TrayProps) {
  const handleDragOver = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault()
    event.dataTransfer.dropEffect = selectedPieces.length >= maxPieces ? 'none' : 'move'
  }

  const handleDrop = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault()
    const pieceId = event.dataTransfer.getData('text/plain')

    if (pieceId !== '') {
      onDropPiece(pieceId)
    }
  }

  return (
    <section
      className="tray"
      aria-label="販売トレイ"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="tray__header">
        <h2>トレイ</h2>
        <p>{selectedPieces.length}/{maxPieces} ピース</p>
      </div>
      <div className="tray__meter" aria-hidden="true">
        <span style={{ width: `${Math.min(toPercent(total), 100)}%` }} />
        <div className="tray__ticks">
          {Array.from({ length: 11 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>
      <div className="tray__pieces">
        {selectedPieces.length === 0 ? (
          <p className="tray__empty">ケーキのピースを<FuriganaText text="選んで" />ね</p>
        ) : (
          selectedPieces.map((piece) => (
            <button
              key={piece.id}
              type="button"
              className="tray-piece"
              onClick={() => onRemovePiece(piece)}
              style={{ borderColor: piece.color }}
            >
              <CakePiecePreview piece={piece} imageUrl={cakeImageUrl} toppings={toppings} />
            </button>
          ))
        )}
      </div>
    </section>
  )
}
