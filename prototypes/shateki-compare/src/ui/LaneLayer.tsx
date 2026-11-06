import { FIELD_H, FIELD_W, UNIFORM_RADIUS } from '../logic/hit';
import { slotX, type LaneGeometry, type LaneState } from '../logic/lane';
import type { Problem } from '../logic/types';
import { HintGlow } from './HintGlow';
import { TargetMark } from './TargetMark';

interface Props {
  problem: Problem;
  lane: LaneState;
  geo: LaneGeometry;
  speed: number;
  /** ゲームの時計（秒） */
  clock: number;
  /** 描画と命中判定で共通に使うレーンの高さ。 */
  y: number;
  /** ヒント（#57）：いま光らせる的か（画面に出ている的についてだけ聞く）と、ヒントの番号 */
  glowing: (targetId: string) => boolean;
  hintSeq: number;
}

/** D のレーンと、その上を流れる的 */
export function LaneLayer({ problem, lane, geo, speed, clock, y, glowing, hintSeq }: Props) {
  return (
    <>
      {/*
        画面が横長だと SVG の左右に余白ができ、フィールドの外（x < 0 や x > FIELD_W）もそこに描かれる。
        画面外の置き場所にいる的や、札が入れ替わる様子が見えないように、フィールドの範囲で切り取る
      */}
      <defs>
        <clipPath id="lane-clip">
          <rect x={0} y={0} width={FIELD_W} height={FIELD_H} />
        </clipPath>
      </defs>
      <g className="lane" clipPath="url(#lane-clip)">
        {lane.slots.map((s, i) => {
          const t = s.cardId ? problem.targets.find((x) => x.id === s.cardId) : undefined;
          if (!t) return null;
          const x = slotX(i, clock, geo, speed);
          // 画面の外の置き場所にいる的は、まだ光らせない（流れてきて見えたときに光り始める。#57）
          const onScreen = x > 0 && x < FIELD_W;
          // 周回ごとに作り直す（札が入れ替わったら新しい的として描く）
          return (
            <g key={`${i}-${s.lap}`} transform={`translate(${x} ${y})`}>
              <TargetMark op={t.op} value={t.value} r={UNIFORM_RADIUS} className={s.down ? 'down' : ''} />
              {!s.down && onScreen && glowing(t.id) && <HintGlow seq={hintSeq} r={UNIFORM_RADIUS + 14} />}
            </g>
          );
        })}
      </g>
    </>
  );
}
