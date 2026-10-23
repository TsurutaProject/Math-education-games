import type { InteractionMode } from '../types/game'
import { toolImages } from '../data/assets'

interface GameControlsProps {
  interactionMode: InteractionMode
  onChangeInteractionMode: (mode: InteractionMode) => void
}

export function GameControls({ interactionMode, onChangeInteractionMode }: GameControlsProps) {
  return (
    <section className="game-controls" aria-label="ゲーム操作">
      <div className="mode-selector" role="group" aria-label="操作モード">
        {(['cut', 'move'] as const).map((mode) => (
          <button key={mode} type="button" aria-pressed={interactionMode === mode}
            className={`mode-button--${mode}${interactionMode === mode ? ' is-active' : ''}`}
            onClick={() => onChangeInteractionMode(mode)}>
            <img src={toolImages[mode]} alt="" />
            <span>{mode === 'cut' ? '切る' : '移す'}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
