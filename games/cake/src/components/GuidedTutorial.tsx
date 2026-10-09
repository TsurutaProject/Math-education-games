import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { FuriganaText } from './FuriganaText'

export type GuidedTutorialStep =
  | 'intro'
  | 'order'
  | 'topping'
  | 'cut'
  | 'move-mode'
  | 'move-piece'
  | 'serve'
  | 'combo'
  | 'trophy'

interface GuidedTutorialProps {
  step: GuidedTutorialStep | null
  onAdvance: () => void
  onSkip: () => void
}

interface CoachPosition {
  left: number
  top: number
  width: number
}

type CoachPlacement = 'above' | 'below' | 'left' | 'right'

const stepContent: Record<Exclude<GuidedTutorialStep, 'intro'>, { title: string; text: string }> = {
  order: {
    title: 'まずは注文を見よう',
    text: '1/2の注文を確認しよう',
  },
  topping: {
    title: 'トッピングも見よう',
    text: '切らないとボーナス',
  },
  cut: {
    title: 'ケーキを半分に切ろう',
    text: '半分に切ってみよう',
  },
  'move-mode': {
    title: 'トングに持ちかえよう',
    text: '移すを押そう',
  },
  'move-piece': {
    title: '1/2のピースを運ぼう',
    text: 'トレイへ運ぼう',
  },
  serve: {
    title: 'お客さんに販売しよう',
    text: '1/2なら販売しよう',
  },
  combo: {
    title: 'コンボを見てみよう',
    text: '成功でコンボが続く',
  },
  trophy: {
    title: 'トロフィーのしくみ',
    text: '達成するとトロフィー獲得',
  },
}

const focusSelectors: Partial<Record<GuidedTutorialStep, string>> = {
  order: '.order-bubble',
  topping: '.cake-board',
  cut: '.cake-board',
  'move-mode': '.mode-button--move',
  'move-piece': '.tray',
  serve: '.serve-button',
  combo: '.score-card--combo',
  trophy: '.trophy-shelf',
}

const placementPriority: Partial<Record<GuidedTutorialStep, CoachPlacement[]>> = {
  order: ['below', 'right', 'left', 'above'],
  topping: ['right', 'below', 'left', 'above'],
  cut: ['right', 'below', 'left', 'above'],
  'move-mode': ['left', 'above', 'right', 'below'],
  'move-piece': ['left', 'above', 'right', 'below'],
  serve: ['left', 'above', 'right', 'below'],
  combo: ['left', 'below', 'above', 'right'],
  trophy: ['right', 'below', 'above', 'left'],
}

const tutorialSteps: Exclude<GuidedTutorialStep, 'intro'>[] = [
  'order',
  'topping',
  'cut',
  'move-mode',
  'move-piece',
  'serve',
  'combo',
  'trophy',
]

export function GuidedTutorial({ step, onAdvance, onSkip }: GuidedTutorialProps) {
  const coachRef = useRef<HTMLElement | null>(null)
  const [coachPosition, setCoachPosition] = useState<CoachPosition | null>(null)

  useEffect(() => {
    if (step === null || step === 'intro') {
      return
    }

    const focusTarget = document.querySelector(focusSelectors[step] ?? '')
    focusTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [step])

  useEffect(() => {
    if (step === null || step === 'intro') {
      return
    }

    const updateCoachPosition = (): void => {
      const focusTarget = document.querySelector(focusSelectors[step] ?? '')
      const coach = coachRef.current

      if (focusTarget === null || coach === null) {
        return
      }

      const margin = 16
      const targetRect = focusTarget.getBoundingClientRect()
      const coachRect = coach.getBoundingClientRect()
      const coachWidth = Math.min(420, window.innerWidth - margin * 2)
      const coachHeight = Math.max(coachRect.height, 180)

      const clamp = (value: number, min: number, max: number): number =>
        Math.min(Math.max(value, min), max)

      const getCandidate = (placement: CoachPlacement): CoachPosition => {
        if (placement === 'right') {
          return {
            left: targetRect.right + margin,
            top: targetRect.top + targetRect.height / 2 - coachHeight / 2,
            width: coachWidth,
          }
        }

        if (placement === 'left') {
          return {
            left: targetRect.left - coachWidth - margin,
            top: targetRect.top + targetRect.height / 2 - coachHeight / 2,
            width: coachWidth,
          }
        }

        if (placement === 'below') {
          return {
            left: targetRect.left + targetRect.width / 2 - coachWidth / 2,
            top: targetRect.bottom + margin,
            width: coachWidth,
          }
        }

        return {
          left: targetRect.left + targetRect.width / 2 - coachWidth / 2,
          top: targetRect.top - coachHeight - margin,
          width: coachWidth,
        }
      }

      const fits = (candidate: CoachPosition): boolean =>
        candidate.left >= margin &&
        candidate.left + candidate.width <= window.innerWidth - margin &&
        candidate.top >= margin &&
        candidate.top + coachHeight <= window.innerHeight - margin

      const candidate =
        (placementPriority[step] ?? ['right', 'left', 'below', 'above'])
          .map(getCandidate)
          .find(fits) ?? getCandidate('below')

      setCoachPosition({
        left: clamp(candidate.left, margin, window.innerWidth - coachWidth - margin),
        top: clamp(candidate.top, margin, window.innerHeight - coachHeight - margin),
        width: coachWidth,
      })
    }

    const frameId = window.requestAnimationFrame(updateCoachPosition)
    window.addEventListener('resize', updateCoachPosition)
    window.addEventListener('scroll', updateCoachPosition, true)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateCoachPosition)
      window.removeEventListener('scroll', updateCoachPosition, true)
    }
  }, [step])

  if (step === null) {
    return null
  }

  if (step === 'intro') {
    return (
      <div className="guided-intro" role="dialog" aria-modal="true" aria-labelledby="guided-intro-title">
        <section className="guided-intro__dialog">
          <p className="guided-intro__label">はじめての<FuriganaText text="接客" /></p>
          <h2 id="guided-intro-title"><FuriganaText text="いっしょに注文を完成させよう" /></h2>
          <p>
            <FuriganaText text="1/2の販売を練習しよう" />
          </p>
          <div className="guided-intro__actions">
            <button type="button" className="button" onClick={onSkip}>
              あとで
            </button>
            <button type="button" className="button button--primary" onClick={onAdvance}>
              <FuriganaText text="接客を始める" />
            </button>
          </div>
        </section>
      </div>
    )
  }

  const content = stepContent[step]
  const stepNumber = tutorialSteps.indexOf(step) + 1
  const coachStyle = coachPosition === null
    ? undefined
    : ({
        '--guided-coach-left': `${coachPosition.left}px`,
        '--guided-coach-top': `${coachPosition.top}px`,
        '--guided-coach-width': `${coachPosition.width}px`,
      } as CSSProperties)

  return (
    <>
      <div className="guided-shade" aria-hidden="true" />
      <aside ref={coachRef} className="guided-coach" style={coachStyle} aria-live="polite">
        <div className="guided-coach__header">
          <span>{stepNumber} / {tutorialSteps.length}</span>
          <button type="button" onClick={onSkip}>スキップ</button>
        </div>
        <strong><FuriganaText text={content.title} /></strong>
        <p><FuriganaText text={content.text} /></p>
        {step === 'order' || step === 'topping' || step === 'combo' || step === 'trophy' ? (
          <button type="button" className="button button--primary" onClick={onAdvance}>
            <FuriganaText
              text={
                step === 'order'
                  ? '注文がわかった'
                  : step === 'topping'
                    ? 'トッピングがわかった'
                  : step === 'combo'
                    ? 'コンボがわかった'
                    : '本番へ進む'
              }
            />
          </button>
        ) : (
          <small><FuriganaText text="光っている場所を操作しよう" /></small>
        )}
      </aside>
    </>
  )
}
