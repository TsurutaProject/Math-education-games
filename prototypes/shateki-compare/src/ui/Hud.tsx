import { formatExpression, formatNumber } from '../logic/ops';
import type { Step } from '../logic/types';

interface Props {
  goal: number;
  steps: Step[];
  shotsLeft: number;
  showExpression: boolean;
  ring: boolean;
  instruction: string;
}

/** 目標と、合計を表示せずに読み直せる大きな式。括弧は既存の演算順に従う。 */
export function Hud({ goal, steps, shotsLeft, showExpression, ring, instruction }: Props) {
  const tokens = steps.length ? formatExpression(steps).match(/\d+(?:\.\d+)?|[^\s]/g) ?? [] : [];
  return <div className="festival-hud">
    <div className="festival-goal" aria-label={`めあて ${formatNumber(goal)}`}>
      <span>めあて</span><strong>{formatNumber(goal)}</strong>
    </div>
    <div className="festival-equation-area">
      <div className="festival-equation-caption" title={instruction}>けいさんしき</div>
      {showExpression && <div className="festival-equation" role="region" aria-label="いまの式" tabIndex={0}>
        <div className="festival-equation-track">
          {tokens.map((token, i) => <span key={`${i}-${token}`} className={/^\d/.test(token) ? 'equation-value' : 'equation-operator'}>{token}</span>)}
          {Array.from({ length: Math.max(0, shotsLeft) }, (_, i) => <span className="equation-pending" key={`pending-${i}`}>
            {(tokens.length > 0 || i > 0) && <span className="equation-continuation" aria-hidden="true">…</span>}
            <span className="equation-slot" aria-label="これから狙う的"><span className={ring ? 'slot-ring' : 'slot-ball'} aria-hidden="true" /></span>
          </span>)}
        </div>
      </div>}
    </div>
  </div>;
}
