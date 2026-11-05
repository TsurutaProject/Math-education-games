import { useId, useState } from 'react'
import trophyIcon from '../data/ui/trophy.png'
import type { TrophyDefinition, TrophyProgress } from '../types/game'
import { FuriganaText } from './FuriganaText'

interface TrophyShelfProps {
  trophies: TrophyDefinition[]
  unlockedTrophyIds: string[]
  progress: TrophyProgress
}

export function TrophyShelf({ trophies, unlockedTrophyIds, progress }: TrophyShelfProps) {
  const maskId = useId()
  const filterId = useId()
  const goldId = useId()
  const [isTrophyListOpen, setIsTrophyListOpen] = useState(false)

  return (
    <>
      <section className="trophy-shelf" aria-label="トロフィー">
        <button
          type="button"
          className="trophy-shelf__button"
          onClick={() => setIsTrophyListOpen(true)}
          aria-haspopup="dialog"
          aria-label={`トロフィー一覧、${unlockedTrophyIds.length}/${trophies.length}獲得`}
        >
          <span className="trophy-shelf__asset" aria-hidden="true">
            <img src={trophyIcon} alt="" draggable={false} />
            <svg className="trophy-shelf__fill" viewBox="0 0 256 256">
              <defs>
                <linearGradient id={goldId} x1="0" x2="1">
                  <stop offset="0%" stopColor="#a96c00" />
                  <stop offset="35%" stopColor="#ffd85a" />
                  <stop offset="55%" stopColor="#fff0a0" />
                  <stop offset="100%" stopColor="#c18a09" />
                </linearGradient>
                <filter id={filterId} colorInterpolationFilters="sRGB">
                  <feColorMatrix type="saturate" values="0" />
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="10" intercept="-9" />
                    <feFuncG type="linear" slope="10" intercept="-9" />
                    <feFuncB type="linear" slope="10" intercept="-9" />
                  </feComponentTransfer>
                </filter>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" style={{ maskType: 'luminance' }}>
                  <image href={trophyIcon} width="256" height="256" filter={`url(#${filterId})`} />
                </mask>
              </defs>
              <g mask={`url(#${maskId})`}>
                <rect width="256" height="256" fill="#e3d7c5" />
                <rect x="0" y={222 - 173 * unlockedTrophyIds.length / Math.max(trophies.length, 1)}
                  width="256" height={173 * unlockedTrophyIds.length / Math.max(trophies.length, 1)}
                  fill={`url(#${goldId})`} />
              </g>
            </svg>
          </span>
          <span className="trophy-shelf__tooltip" aria-hidden="true">
            現在のトロフィー {unlockedTrophyIds.length}/{trophies.length}
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
                  <div
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
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
