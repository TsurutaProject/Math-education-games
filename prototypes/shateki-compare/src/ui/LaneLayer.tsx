import { UNIFORM_RADIUS } from '../logic/hit';
import { LANE_Y, slotX, type DownReason, type LaneGeometry, type LaneState } from '../logic/lane';
import type { Problem } from '../logic/types';
import { TargetMark } from './TargetMark';

interface Props {
  problem: Problem;
  lane: LaneState;
  geo: LaneGeometry;
  speed: number;
  /** ゲームの時計（秒） */
  clock: number;
}

/** 当てた → 奥へパタンと倒れる。引けなくなった → 灰色になって、ゆっくり奥へ倒れる */
const DOWN_CLASS: Record<DownReason, string> = { hit: 'lane-hit', invalid: 'lane-invalid' };

/** D のレーンと、その上を流れる的 */
export function LaneLayer({ problem, lane, geo, speed, clock }: Props) {
  return (
    <g className="lane">
      {lane.slots.map((s, i) => {
        const t = s.cardId ? problem.targets.find((x) => x.id === s.cardId) : undefined;
        if (!t) return null;
        // 周回ごとに作り直す（札が入れ替わったら新しい的として描く）
        return (
          <g key={`${i}-${s.lap}`} transform={`translate(${slotX(i, clock, geo, speed)} ${LANE_Y})`}>
            <TargetMark op={t.op} value={t.value} r={UNIFORM_RADIUS} className={s.down ? DOWN_CLASS[s.down] : ''} />
          </g>
        );
      })}
    </g>
  );
}
