import { formatExpression } from '../logic/ops';
import type { Step } from '../logic/types';
import type { ZukanEntry } from '../logic/zukan';

export function OutOverlay({
  goal,
  steps,
  onRetry,
  onNext,
}: {
  goal: number;
  steps: Step[];
  onRetry: () => void;
  onNext: () => void;
}) {
  return (
    <div className="overlay">
      <div className="panel out-panel">
        <div className="big-msg">おしい！</div>
        <div className="sub-msg">めあて {goal}</div>
        {steps.length > 0 && (
          <div className="mini-expr">
            {formatExpression(steps)}
          </div>
        )}
        <button className="btn primary" onClick={onRetry} autoFocus>
          もういちど
        </button>
        <button className="btn ghost" onClick={onNext}>
          つぎの問題へ
        </button>
      </div>
    </div>
  );
}

export function CelebrateOverlay({ prize }: { prize?: string }) {
  return (
    <div className="overlay clear-overlay">
      {prize ? (
        <div className="prize-get">
          <div className="prize-fall">{prize}</div>
          <div className="big-msg">ゲット！</div>
        </div>
      ) : (
        <div className="big-msg celebrate">やったね！</div>
      )}
    </div>
  );
}

export function ZukanScreen({
  goal,
  entries,
  total,
  latestKey,
  latestIsNew,
  prize,
  guideNext = false,
  onAnother,
  onNext,
}: {
  goal: number;
  entries: ZukanEntry[];
  total: number;
  latestKey: string;
  latestIsNew: boolean;
  prize?: string;
  /** はじめの手引き（#15）：「つぎの問題へ」を光らせて、押してもらう */
  guideNext?: boolean;
  onAnother: () => void;
  onNext: () => void;
}) {
  const all = entries.length >= total;
  return (
    <div className="overlay">
      <div className="panel zukan">
        <div className="zukan-head">
          {prize && <span className="zukan-prize">{prize}</span>}
          <div>
            <div className="zukan-title">解き方ずかん</div>
            <div className="zukan-count">
              {total}つ中 <b>{entries.length}つ</b> 見つけた！
            </div>
          </div>
        </div>
        <div className="sub-msg">
          {all
            ? 'ぜんぶ見つけたね！すごい！'
            : latestIsNew
              ? 'あたらしい 解き方を 見つけた！'
              : 'この 解き方は もう 見つけているよ。ほかにもあるかな？'}
        </div>
        <SolutionCards entries={entries} total={total} goal={goal} latestKey={latestKey} latestIsNew={latestIsNew} />

        <div className="zukan-buttons">
          {!all && (
            <button className={`btn ${guideNext ? 'ghost' : 'primary'}`} onClick={onAnother} autoFocus={!guideNext}>
              べつの解き方をさがす
            </button>
          )}
          <button className={`btn ${all || guideNext ? 'primary' : 'ghost'} ${guideNext ? 'tutorial-pulse' : ''}`} onClick={onNext} autoFocus={guideNext}>
            つぎの問題へ
          </button>
          {all && (
            <button className="btn ghost" onClick={onAnother}>
              もういちど あそぶ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 遊んでいる画面とクリア後で、発見済み・未発見の見せ方をそろえる。 */
export function SolutionCards({ entries, total, goal, latestKey = '', latestIsNew = false, compact = false }: {
  entries: ZukanEntry[];
  total: number;
  goal: number;
  latestKey?: string;
  latestIsNew?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`cards ${compact ? 'cards-compact' : ''}`} tabIndex={compact ? 0 : undefined} role={compact ? 'region' : undefined} aria-label={compact ? '見つけた解き方と未発見の一覧' : undefined}>
      {entries.map((entry) => (
        <div key={entry.key} className={`card ${entry.key === latestKey ? 'latest' : ''}`}>
          {entry.key === latestKey && latestIsNew && <span className="new-badge">NEW</span>}
          {entry.expression} = {goal}
        </div>
      ))}
      {Array.from({ length: Math.max(0, total - entries.length) }, (_, index) => (
        <div key={`q${index}`} className="card unknown" aria-label="まだ見つけていない解き方">？</div>
      ))}
    </div>
  );
}
