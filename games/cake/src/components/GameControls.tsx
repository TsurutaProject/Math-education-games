import type { InteractionMode } from '../types/game'
import { toolImages } from '../data/assets'
import { FuriganaText } from './FuriganaText'

interface GameControlsProps {
  interactionMode: InteractionMode
  canServe: boolean
  onChangeInteractionMode: (mode: InteractionMode) => void
  onServe: () => void
  onClear: () => void
}

export function GameControls({
  interactionMode,
  canServe,
  onChangeInteractionMode,
  onServe,
  onClear,
}: GameControlsProps) {
  return (
    <section className="game-controls" aria-label="ゲーム操作">
      <div>
        <p className="control-label"><FuriganaText text="操作" /></p>
        <div className="mode-selector" role="group" aria-label="操作モード">
          <button
            type="button"
            className={`mode-button--cut${interactionMode === 'cut' ? ' is-active' : ''}`}
            onClick={() => onChangeInteractionMode('cut')}
          >
            <img src={toolImages.cut} alt="" aria-hidden="true" />
            <span>カット</span>
          </button>
          <button
            type="button"
            className={`mode-button--move${interactionMode === 'move' ? ' is-active' : ''}`}
            onClick={() => onChangeInteractionMode('move')}
          >
            <img src={toolImages.move} alt="" aria-hidden="true" />
            <span><FuriganaText text="移す" /></span>
          </button>
        </div>
      </div>
      <div className="game-controls__actions">
        <button type="button" className="button button--danger" onClick={onClear}>
          もどす
        </button>
        <button
          type="button"
          className={canServe ? 'button button--primary serve-button is-ready' : 'button button--primary serve-button'}
          onClick={onServe}
        >
          <FuriganaText text="販売する" />
        </button>
      </div>
    </section>
  )
}
