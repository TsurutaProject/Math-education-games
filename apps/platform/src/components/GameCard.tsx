import type { CSSProperties } from 'react'
import type { GameEntry } from '../data/games'
import { RubyText } from './RubyText'

interface GameCardProps {
  game: GameEntry
  /** カードをタップしてゲームへ移る直前に呼ばれる（ログ用） */
  onOpen: (game: GameEntry) => void
}

export function GameCard({ game, onOpen }: GameCardProps) {
  const style = { '--game-color': game.color } as CSSProperties
  const isPlayable = game.href !== undefined

  const body = (
    <>
      {game.isNew ? (
        <span className="ribbon" aria-hidden="true">
          NEW!
        </span>
      ) : null}
      <span className="game-card__icon" aria-hidden="true">
        {game.icon}
      </span>
      <span className="game-card__title">
        <RubyText segments={game.title} />
      </span>
      <span className="game-card__hint">{isPlayable ? 'タップしてあそぶ' : 'じゅんびちゅう'}</span>
    </>
  )

  if (!isPlayable) {
    return (
      <div className="game-card is-disabled" style={style} role="group" aria-label="じゅんびちゅう">
        {body}
      </div>
    )
  }

  return (
    <a className="game-card" href={game.href} style={style} aria-label={game.label} onClick={() => onOpen(game)}>
      {body}
    </a>
  )
}
