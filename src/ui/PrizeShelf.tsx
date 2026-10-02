/** C の景品。目標に近づくほど大きく揺れ、届くと倒れる。 */
const PRIZES = ['🧸', '🎁', '🍭', '🚀', '🦕', '🎈', '🪀', '🍩'];

export function prizeFor(problemId: string): string {
  let h = 0;
  for (const ch of problemId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PRIZES[h % PRIZES.length];
}

export function PrizeShelf({ prize, goal, current, hits, fallen }: { prize: string; goal: number; current: number; hits: number; fallen: boolean }) {
  // 近さ 0〜1（目標ちょうどで 1）
  const closeness = Math.max(0, 1 - Math.abs(goal - current) / Math.max(1, goal));
  const deg = 3 + closeness * 14;
  return (
    <div className="prize-shelf" aria-label="けいひん">
      <div
        key={hits}
        className={`prize ${fallen ? 'fallen' : hits > 0 ? 'wobble' : ''}`}
        style={{ '--wobble': `${deg}deg` } as React.CSSProperties}
      >
        {prize}
      </div>
      <div className="prize-board" />
    </div>
  );
}
