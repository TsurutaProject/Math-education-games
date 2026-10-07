import type { ResultState } from '../types/game'
import { feedbackImages } from '../data/assets'
import { FuriganaText } from './FuriganaText'

interface ResultMessageProps {
  result: ResultState
  onDismiss: () => void
  onConfirm?: () => void
}

export function ResultMessage({ result, onDismiss, onConfirm }: ResultMessageProps) {
  if (result.kind === 'idle') {
    return null
  }

  const isWarning = result.kind === 'warning'
  const isCelebration = result.celebration !== undefined
  const reactionImage =
    result.kind === 'try-again'
      ? feedbackImages.dissatisfied
      : result.kind === 'bonus'
        ? feedbackImages.happy
        : feedbackImages.normal
  const reactionLabel =
    result.kind === 'try-again'
      ? '不満そうな表情'
      : result.kind === 'bonus'
        ? '嬉しそうな表情'
        : '落ち着いた表情'

  return (
    <div
      className={`result-overlay${isCelebration ? ` result-overlay--${result.celebration}` : ''}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      {isCelebration ? (
        <div className="result-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      ) : null}
      <section className={`result-message result-message--${result.kind}`} aria-live="polite">
        <div className="result-message__scene">
          <img className="result-message__face" src={reactionImage} alt={reactionLabel} />
          <div className="result-message__bubble">
            <img src={feedbackImages.speechBubble} alt="" aria-hidden="true" />
            <div className="result-message__content">
              <strong id="result-title"><FuriganaText text={result.title} /></strong>
              <div className="result-message__summary">
                <span><FuriganaText text={result.detail} /></span>
                {result.earnedMoney !== undefined || result.combo !== undefined ? (
                  <div className="result-reward" aria-label="今回の報酬">
                    {result.earnedMoney !== undefined ? (
                      <strong>+{result.earnedMoney.toLocaleString()}<FuriganaText text="円" /></strong>
                    ) : null}
                    {result.combo !== undefined ? (
                      <b>{result.combo} COMBO</b>
                    ) : null}
                  </div>
                ) : null}
                {result.highlights?.map((highlight) => (
                  <p key={highlight} className="result-highlight">
                    <FuriganaText text={highlight} />
                  </p>
                ))}
              </div>
              <div className="result-message__actions">
                {isWarning ? (
                  <button type="button" className="button button--secondary" onClick={onDismiss}>
                    <FuriganaText text={result.secondaryLabel ?? '戻る'} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button button--primary"
                  onClick={isWarning ? onConfirm : onDismiss}
                >
                  <FuriganaText text={result.primaryLabel ?? 'OK'} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
