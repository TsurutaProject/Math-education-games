import { useState } from 'react'
import type { TrophyDefinition, TrophyProgress } from '../types/game'
import { FuriganaText } from './FuriganaText'

interface TrophyShelfProps {
  trophies: TrophyDefinition[]
  unlockedTrophyIds: string[]
  progress: TrophyProgress
}

export function TrophyShelf({ trophies, unlockedTrophyIds, progress }: TrophyShelfProps) {
  const [isTrophyListOpen, setIsTrophyListOpen] = useState(false)

  return (
    <>
      <section className="trophy-shelf" aria-label="トロフィー">
        <button
          type="button"
          className="trophy-shelf__button"
          onClick={() => setIsTrophyListOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="trophy-shelf__header">
            <span>トロフィー</span>
            <strong>{unlockedTrophyIds.length}/{trophies.length}</strong>
          </span>
          <span className="trophy-open-button__body">
            <span className="trophy-open-button__icon" aria-hidden="true">★</span>
            <span>
              <strong><FuriganaText text="一覧を見る" /></strong>
              <small><FuriganaText text="実績の内容と進み具合を確認" /></small>
            </span>
          </span>
        </button>
      </section>

      {isTrophyListOpen ? (
        <div className="help-overlay help-overlay--trophy" role="dialog" aria-modal="true" aria-labelledby="trophy-list-title">
          <section className="help-dialog trophy-browser">
            <button
              type="button"
              className="help-dialog__close"
              aria-label="閉じる"
              onClick={() => setIsTrophyListOpen(false)}
            >
              ×
            </button>
            <div className="trophy-browser__header">
              <h2 id="trophy-list-title">トロフィー</h2>
              <p>{unlockedTrophyIds.length}/{trophies.length}</p>
            </div>
            <div className="trophy-browser__grid">
              {trophies.map((trophy) => {
                const isUnlocked = unlockedTrophyIds.includes(trophy.id)
                const currentValue = progress[trophy.metric]
                const progressRatio = Math.min(currentValue / trophy.target, 1)

                return (
                  <button
                    type="button"
                    key={trophy.id}
                    className={isUnlocked ? 'trophy-detail-card is-unlocked' : 'trophy-detail-card'}
                  >
                    <div className="trophy-detail-card__content">
                      <span className="trophy-detail-card__icon" aria-hidden="true">
                        {isUnlocked ? '★' : '?'}
                      </span>
                      <div>
                        <h3><FuriganaText text={trophy.title} /></h3>
                        <p><FuriganaText text={trophy.description} /></p>
                      </div>
                    </div>
                    <div className="trophy-detail-card__meter" aria-hidden="true">
                      <span style={{ width: `${progressRatio * 100}%` }} />
                    </div>
                    <small>
                      {isUnlocked ? (
                        <FuriganaText text="獲得済み" />
                      ) : (
                        <>
                          {Math.min(currentValue, trophy.target).toLocaleString()}/
                          {trophy.target.toLocaleString()}
                        </>
                      )}
                    </small>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
