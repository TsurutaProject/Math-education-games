import type { CSSProperties } from 'react';
import { OP_INK } from './artworkAssets';
import { formatNumber, targetLabel } from '../logic/ops';
import type { Step } from '../logic/types';

interface Props {
  goal: number;
  steps: Step[];
  shotsLeft: number;
  showExpression: boolean;
  instruction: string;
}

/**
 * 0 から始まる式と、右に薄いめあて。当てた的は「+10」「×2」のように演算子ごと箱に入れ、的の色にそろえる。
 * 先頭の 0 は画面の表示だけ（ログ・図鑑の式は formatExpression のまま）。
 */
export function Hud({ goal, steps, shotsLeft, showExpression, instruction }: Props) {
  return <div className="festival-hud">
    <div className="festival-equation-area">
      <div className="festival-equation-caption" title={instruction}>けいさんしき</div>
      <div className="festival-equation-row">
        {showExpression && <div className="festival-equation" role="region" aria-label="いまの式" tabIndex={0}>
          <div className="festival-equation-track">
            <span className="equation-zero">0</span>
            {steps.map((s, i) => <span key={`${i}-${s.targetId}`} className="equation-term" style={{ '--op-ink': OP_INK[s.op] } as CSSProperties}>
              {targetLabel(s.op, s.value)}
            </span>)}
            {Array.from({ length: Math.max(0, shotsLeft) }, (_, i) => <span className="equation-pending" key={`pending-${i}`}>
              <span className="equation-continuation" aria-hidden="true">…</span>
              <span className="equation-slot" aria-label="これから狙う的">？</span>
            </span>)}
          </div>
        </div>}
        <div className={`equation-goal ${showExpression ? '' : 'equation-goal-only'}`} aria-label={`めあて ${formatNumber(goal)}`}>
          {showExpression ? '= ' : 'めあて '}{formatNumber(goal)}
        </div>
      </div>
    </div>
  </div>;
}
