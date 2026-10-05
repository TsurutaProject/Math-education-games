import { formatExpression, formatNumber } from '../logic/ops';
import type { Step } from '../logic/types';
import type { ZukanEntry } from '../logic/zukan';

export function OutOverlay({
  goal,
  current,
  steps,
  onRetry,
  onNext,
}: {
  goal: number;
  current: number;
  steps: Step[];
  onRetry: () => void;
  onNext: () => void;
}) {
  const diff = goal - current;
  return (
    <div className="overlay">
      <div className="panel out-panel">
        <div className="big-msg">おしい！</div>
        <div className="sub-msg">{diff > 0 ? `あと ${diff}` : `${-diff} こえちゃった`}</div>
        {steps.length > 0 && (
          <div className="mini-expr">
            {formatExpression(steps)} = {formatNumber(current)}
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
  onAnother,
  onNext,
}: {
  goal: number;
  entries: ZukanEntry[];
  total: number;
  latestKey: string;
  latestIsNew: boolean;
  prize?: string;
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
        <div className="cards">
          {entries.map((e) => (
            <div key={e.key} className={`card ${e.key === latestKey ? 'latest' : ''}`}>
              {e.key === latestKey && latestIsNew && <span className="new-badge">NEW</span>}
              {e.expression} = {goal}
            </div>
          ))}
          {Array.from({ length: Math.max(0, total - entries.length) }, (_, i) => (
            <div key={`q${i}`} className="card unknown">
              ？
            </div>
          ))}
        </div>
        <div className="zukan-buttons">
          {!all && (
            <button className="btn primary" onClick={onAnother} autoFocus>
              べつの解き方をさがす
            </button>
          )}
          <button className={`btn ${all ? 'primary' : 'ghost'}`} onClick={onNext}>
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
