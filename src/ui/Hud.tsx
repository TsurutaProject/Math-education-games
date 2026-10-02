import { useEffect, useRef, useState } from 'react';
import { formatExpression, formatNumber } from '../logic/ops';
import type { Step } from '../logic/types';

interface Props {
  goal: number;
  current: number;
  shots: number;
  shotsLeft: number;
  steps: Step[];
  showExpression: boolean;
  /** 数が変わるときにカウントアップする時間（ミリ秒）。0 なら即時。 */
  countMs: number;
  /** カウントアップを始めるまでの間（ミリ秒）。C で的が倒れるのを待つ。 */
  countDelayMs: number;
  onRestart: () => void;
  prize?: React.ReactNode;
}

/** 数をなめらかに変える */
function useCountUp(value: number, ms: number, delay: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (ms <= 0 && delay <= 0) {
      setShown(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const a = from.current;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / Math.max(1, ms)));
      const v = Math.round(a + (value - a) * k);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, delay]);
  return shown;
}

export function Hud({ goal, current, shots, shotsLeft, steps, showExpression, countMs, countDelayMs, onRestart, prize }: Props) {
  const shown = useCountUp(current, countMs, countDelayMs);
  const diff = goal - shown;
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (steps.length > 0) setBump((b) => b + 1);
  }, [steps.length]);

  return (
    <div className="hud">
      <div className="hud-box goal">
        <div className="hud-label">目標</div>
        <div className="hud-value">{goal}</div>
      </div>
      <div className="hud-box now">
        <div className="hud-label">いまの数</div>
        <div key={bump} className={`hud-value ${bump ? 'bump' : ''}`}>
          {formatNumber(shown)}
        </div>
      </div>
      <div className="hud-box diff">
        <div className="hud-label">{diff >= 0 ? 'あと' : 'こえた'}</div>
        <div className="hud-value">{diff >= 0 ? diff : -diff}</div>
      </div>
      <div className="hud-box ammo">
        <div className="hud-label">のこりの たま</div>
        <div className="corks" aria-label={`のこり ${shotsLeft} 発`}>
          {Array.from({ length: shots }, (_, i) => (
            <span key={i} className={`cork ${i < shotsLeft ? '' : 'used'}`} />
          ))}
        </div>
      </div>
      {prize}
      <button className="btn restart" onClick={onRestart}>
        さいしょから
      </button>
      {showExpression && (
        <div className="expr">
          {steps.length === 0 ? 'まとを えらんで うってみよう' : `${formatExpression(steps)} = ${formatNumber(current)}`}
        </div>
      )}
    </div>
  );
}
