import { riseSlotPlace, type RiseState } from '../logic/rise';
import type { Problem } from '../logic/types';
import { TargetMark } from './TargetMark';

interface Props {
  problem: Problem;
  rise: RiseState;
}

/**
 * E の的。置き場所は動かない。
 * - 新しく起き上がる的は、ピョコッと起き上がり（rise.ts の RISE_SEC と同じ長さ）、光る輪が広がる
 * - 当てた的は C と同じ倒れ方（ぐらついてから倒れる）、いれかえた的は静かに沈む。倒れきると見えなくなる
 * 最初から立っている的（起き上がる時刻が「ずっと前」）は、起き上がる演出をしない。
 */
export function RiseLayer({ problem, rise }: Props) {
  return (
    <g className="rise">
      {rise.slots.map((s, i) => {
        const t = s.cardId ? problem.targets.find((x) => x.id === s.cardId) : undefined;
        if (!t) return null;
        const { x, y, r } = riseSlotPlace(i, rise.slots.length);
        const risen = Number.isFinite(s.appearAt);
        const cls = s.fell === 'hit' ? 'down' : s.fell === 'swap' ? 'sink' : risen ? 'rising' : '';
        // 起き上がるたびに作り直す（新しい的として描く。演出は作られたときに1回だけ動く）
        return (
          <g key={`${i}-${s.appearAt}`} transform={`translate(${x} ${y})`}>
            {risen && !s.fell && <circle r={r} className="rise-flash" />}
            <TargetMark op={t.op} value={t.value} r={r} className={cls} />
          </g>
        );
      })}
    </g>
  );
}
