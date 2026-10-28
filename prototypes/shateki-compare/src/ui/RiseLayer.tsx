import { riseSlotPlace, type RiseState } from '../logic/rise';
import type { Problem } from '../logic/types';
import { TargetMark } from './TargetMark';

interface Props {
  problem: Problem;
  rise: RiseState;
}

/**
 * E の的。置き場所は動かない。
 * 当てた的は C と同じ倒れ方（ぐらついてから倒れる）、いれかえた的はすぐ倒れる。倒れきると見えなくなる。
 */
export function RiseLayer({ problem, rise }: Props) {
  return (
    <g className="rise">
      {rise.slots.map((s, i) => {
        const t = s.cardId ? problem.targets.find((x) => x.id === s.cardId) : undefined;
        if (!t) return null;
        const { x, y, r } = riseSlotPlace(i, rise.slots.length);
        const cls = s.fell === 'hit' ? 'down heavy' : s.fell === 'swap' ? 'down' : '';
        // 起き上がるたびに作り直す（新しい的として描く）
        return (
          <g key={`${i}-${s.appearAt}`} transform={`translate(${x} ${y})`}>
            <TargetMark op={t.op} value={t.value} r={r} className={cls} />
          </g>
        );
      })}
    </g>
  );
}
