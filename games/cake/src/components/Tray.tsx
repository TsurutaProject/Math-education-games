import type { DragEvent } from 'react'
import type { CakePieceModel, Topping } from '../types/game'
import { CakePiecePreview } from './CakePiecePreview'
import { FuriganaText } from './FuriganaText'

interface TrayProps {
  selectedPieces: CakePieceModel[]
  maxPieces: number
  cakeImageUrl: string
  toppings: Topping[]
  onRemovePiece: (piece: CakePieceModel) => void
  onDropPiece: (pieceId: string) => void
}

export function Tray({ selectedPieces, maxPieces, cakeImageUrl, toppings, onRemovePiece, onDropPiece }: TrayProps) {
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
        <h2 className="asset-label tray-label">トレー</h2>
      </div>
      <div className="tray__pieces">
        {selectedPieces.length === 0 ? (
          <p className="tray__empty">ここにケーキを<FuriganaText text="置こう" /></p>
        ) : (
          selectedPieces.map((piece) => (
            <button
              key={piece.id}
              type="button"
              className="tray-piece"
              aria-label="このピースをまな板に戻す"
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
