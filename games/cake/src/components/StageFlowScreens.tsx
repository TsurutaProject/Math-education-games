import type { Stage, StageResultSummary } from '../types/game'
import { toppingImages } from '../data/assets'
import { FuriganaText } from './FuriganaText'

interface TitleScreenProps {
  onStart: () => void
}

interface StageSelectScreenProps {
  stages: Stage[]
  maxUnlockedStage: number
  completedStageIds: string[]
  onSelectStage: (stageIndex: number) => void
  onBackToTitle: () => void
}

interface StageResultModalProps {
  stage: Stage
  summary: StageResultSummary
  isFinalStage: boolean
  onReplay: () => void
  onSelectStage: () => void
  onNextStage: () => void
}

interface ChapterResultModalProps {
  stages: Stage[]
  onSelectStage: () => void
  onRestart: () => void
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <main className="flow-screen flow-screen--title">
      <section className="flow-panel flow-panel--title" aria-labelledby="game-title">
        <p className="flow-panel__eyebrow"><FuriganaText text="ケーキを切って、ぴったり販売" /></p>
        <h1 id="game-title"><FuriganaText text="分ケーキ" /></h1>
        <p><FuriganaText text="お客さんの注文どおりに、ケーキを分けよう。" /></p>
        <figure className="flow-panel__title-cake" aria-label="切り分けたショートケーキ">
          <svg viewBox="0 0 260 240" role="img" aria-hidden="true">
            <defs>
              <radialGradient id="title-cake-frosting" cx="42%" cy="36%" r="72%">
                <stop offset="0%" stopColor="#fffefc" />
                <stop offset="72%" stopColor="#fff9f6" />
                <stop offset="100%" stopColor="#f2e4df" />
              </radialGradient>
            </defs>
            <circle className="title-cake__plate" cx="120" cy="120" r="112" />
            <g className="title-cake__whole">
              <path className="title-cake__surface" d="M120 120 L201.4 73 A94 94 0 1 1 120 26 Z" />
              <path className="title-cake__gap" d="M120 120 L120 16 A104 104 0 0 1 210.1 68 Z" />
            </g>
            <g className="title-cake__slice" transform="translate(20 -8)">
              <path className="title-cake__slice-fill" d="M120 120 L120 26 A94 94 0 0 1 201.4 73 Z" />
            </g>
            <image className="title-cake__topping" href={toppingImages.strawberry} x="139" y="130" width="42" height="42" />
            <image className="title-cake__topping" href={toppingImages.banana} x="146" y="58" width="42" height="42" />
            <image className="title-cake__topping" href={toppingImages.cream} x="59" y="150" width="44" height="44" />
          </svg>
        </figure>
        <button type="button" className="button button--primary flow-panel__start" onClick={onStart}>
          <FuriganaText text="はじめる" />
        </button>
      </section>
    </main>
  )
}

export function StageSelectScreen({
  stages,
  maxUnlockedStage,
  completedStageIds,
  onSelectStage,
  onBackToTitle,
}: StageSelectScreenProps) {
  return (
    <main className="flow-screen">
      <section className="flow-panel flow-panel--stage-select" aria-labelledby="stage-select-title">
        <div className="flow-panel__heading">
          <div>
            <p className="flow-panel__eyebrow">チャプター 1</p>
            <h1 id="stage-select-title"><FuriganaText text="ステージを選ぶ" /></h1>
          </div>
          <button type="button" className="button button--secondary" onClick={onBackToTitle}>
            タイトルへ
          </button>
        </div>
        <div className="stage-select-grid">
          {stages.map((stage, index) => {
            const isUnlocked = index <= maxUnlockedStage
            const isCompleted = completedStageIds.includes(stage.id)

            return (
              <article
                key={stage.id}
                className={`stage-select-card${isUnlocked ? ' is-unlocked' : ' is-locked'}${isCompleted ? ' is-completed' : ''}`}
              >
                <div className="stage-select-card__topline">
                  <span>{isCompleted ? 'クリア済み' : isUnlocked ? '挑戦できる' : 'ロック中'}</span>
                </div>
                <h2><FuriganaText text={`ステージ${index + 1}「${stage.title}」`} /></h2>
                <small><FuriganaText text={stage.goal} /></small>
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!isUnlocked}
                  onClick={() => onSelectStage(index)}
                >
                  {isUnlocked ? '遊ぶ' : 'ロック'}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export function StageResultModal({
  stage,
  summary,
  isFinalStage,
  onReplay,
  onSelectStage,
  onNextStage,
}: StageResultModalProps) {
  return (
    <div className="stage-result-overlay" role="dialog" aria-modal="true" aria-labelledby="stage-result-title">
      <div className="result-confetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
      </div>
      <section className="stage-result-modal">
        <p className="stage-result-modal__eyebrow">STAGE CLEAR</p>
        <h2 id="stage-result-title"><FuriganaText text={`ステージ${summary.stageIndex + 1} クリア！`} /></h2>
        <p className="stage-result-modal__title"><FuriganaText text={stage.title} /></p>
        <p className="stage-result-modal__goal"><FuriganaText text={stage.goal} /></p>
        <dl className="stage-result-stats">
          <div>
            <dt>販売した人数</dt>
            <dd>{summary.servedCount} / {stage.targetServes}</dd>
          </div>
          <div>
            <dt>獲得売上</dt>
            <dd>{summary.earnedMoney.toLocaleString()}円</dd>
          </div>
          <div>
            <dt>最高コンボ</dt>
            <dd>{summary.bestCombo} COMBO</dd>
          </div>
        </dl>
        {summary.unlockedNextStage ? <p className="stage-result-modal__unlock">次のステージが解放されました！</p> : null}
        <div className="stage-result-modal__actions">
          <button type="button" className="button button--secondary" onClick={onReplay}>もう一度</button>
          <button type="button" className="button button--secondary" onClick={onSelectStage}>ステージ選択</button>
          <button type="button" className="button button--primary" onClick={onNextStage}>
            {isFinalStage ? 'チャプター結果へ' : '次のステージ'}
          </button>
        </div>
      </section>
    </div>
  )
}

export function ChapterResultModal({ stages, onSelectStage, onRestart }: ChapterResultModalProps) {
  return (
    <main className="flow-screen">
      <section className="flow-panel flow-panel--chapter-result" aria-labelledby="chapter-result-title">
        <p className="flow-panel__eyebrow">CHAPTER COMPLETE</p>
        <h1 id="chapter-result-title"><FuriganaText text="基本の分け方 クリア！" /></h1>
        <p>{stages.length}ステージすべてをクリアしました。</p>
        <div className="chapter-stage-list" aria-label="クリアしたステージ">
          {stages.map((stage, index) => <span key={stage.id}>ステージ {index + 1} クリア</span>)}
        </div>
        <div className="flow-panel__actions">
          <button type="button" className="button button--secondary" onClick={onSelectStage}>ステージ選択</button>
          <button type="button" className="button button--primary" onClick={onRestart}>最初から遊ぶ</button>
        </div>
      </section>
    </main>
  )
}
