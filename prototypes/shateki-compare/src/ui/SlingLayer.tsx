import { BALL_R, guidePath, LAUNCHER, MAX_PULL } from '../logic/sling';

/** 引っ張ったとき、画面上でゴムがのびる見た目の倍率（実際の引っ張りより短く描く） */
const VISUAL_PULL = 0.32;
const PRONG_DX = 38;
const PRONG_Y = LAUNCHER.y - 6;

interface Props {
  /** 引っ張っている向きと長さ（押した点 → 今の指） */
  pull: { dx: number; dy: number } | null;
  /** 引っ張りが十分なときの、飛ぶ角度（揺れこみ） */
  angleDeg: number | null;
  guideLength: number;
  bounce: boolean;
  /** 飛んでいる弾と、その少し前の位置 */
  flying: { x: number; y: number; trail: Array<{ x: number; y: number }> } | null;
  /** 弾がセットされているか（飛んでいる間・弾切れのときは空） */
  loaded: boolean;
}

export function SlingLayer({ pull, angleDeg, guideLength, bounce, flying, loaded }: Props) {
  let pouch = { x: LAUNCHER.x, y: LAUNCHER.y };
  if (pull) {
    const len = Math.hypot(pull.dx, pull.dy);
    if (len > 0) {
      const k = (Math.min(len, MAX_PULL) * VISUAL_PULL) / len;
      pouch = { x: LAUNCHER.x + pull.dx * k, y: LAUNCHER.y + pull.dy * k };
    }
  }
  const left = { x: LAUNCHER.x - PRONG_DX, y: PRONG_Y };
  const right = { x: LAUNCHER.x + PRONG_DX, y: PRONG_Y };
  const guide = angleDeg !== null ? guidePath(angleDeg, guideLength, bounce) : null;
  const end = guide?.[guide.length - 1];

  return (
    <g className="sling">
      {guide && (
        <>
          <polyline points={guide.map((p) => `${p.x},${p.y}`).join(' ')} className="sling-guide" />
          {end && <circle cx={end.x} cy={end.y} r={7} className="sling-guide-end" />}
        </>
      )}
      {/* うしろのゴム */}
      <line x1={right.x} y1={right.y} x2={pouch.x} y2={pouch.y} className="sling-band" />
      {/* 本体（Y の形） */}
      <path
        d={`M${LAUNCHER.x} ${LAUNCHER.y + 62} L${LAUNCHER.x} ${LAUNCHER.y + 26} L${left.x} ${left.y} M${LAUNCHER.x} ${LAUNCHER.y + 26} L${right.x} ${right.y}`}
        className="sling-frame"
      />
      {loaded && <circle cx={pouch.x} cy={pouch.y} r={BALL_R} className="sling-ball" />}
      {/* 手前のゴム */}
      <line x1={left.x} y1={left.y} x2={pouch.x} y2={pouch.y} className="sling-band" />
      {flying && (
        <>
          {flying.trail.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={BALL_R * (0.4 + (0.5 * i) / flying.trail.length)} className="sling-trail" />
          ))}
          <circle cx={flying.x} cy={flying.y} r={BALL_R} className="sling-ball" />
        </>
      )}
    </g>
  );
}
