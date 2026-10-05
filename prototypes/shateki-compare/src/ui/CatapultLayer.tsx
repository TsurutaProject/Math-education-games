import { arcPoint, CATAPULT, DEPTH_MAX, DEPTH_MIN, type CatapultShot } from '../logic/catapult';
import { MAX_PULL } from '../logic/sling';

/** うでの根元（車輪の上） */
const PIVOT = { x: CATAPULT.x, y: CATAPULT.y + 32 };
const ARM = 40;
const BALL = 12;

interface Props {
  pull: { dx: number; dy: number } | null;
  /** 引っ張りが十分なときのねらい（揺れこみ） */
  shot: CatapultShot | null;
  /** 着地点と山なりの道すじを見せるか（オフなら向きの線と強さだけ） */
  showLanding: boolean;
  /** 飛んでいる弾。t は 0〜1 */
  flying: { from: { x: number; y: number }; to: { x: number; y: number }; t: number } | null;
  loaded: boolean;
}

function arcPathD(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const pts = Array.from({ length: 25 }, (_, i) => arcPoint(from, to, i / 24));
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
}

export function CatapultLayer({ pull, shot, showLanding, flying, loaded }: Props) {
  // うでの角度：引っ張るほど後ろ（引いた向き）に倒れる。飛ばした直後は前に振り切る。
  let armDeg = 0;
  if (pull) {
    const len = Math.min(Math.hypot(pull.dx, pull.dy), MAX_PULL);
    const side = pull.dx === 0 ? 0 : Math.sign(pull.dx) * Math.min(1, Math.abs(pull.dx) / Math.max(1, len));
    armDeg = (len / MAX_PULL) * 55 * (pull.dy >= 0 ? 1 : 0.3) + side * 10;
  } else if (flying && flying.t < 0.35) {
    armDeg = -35;
  }
  const rad = (armDeg * Math.PI) / 180;
  // うでは真上を 0 として、+ で手前（画面の下）に倒れる見た目にする
  const tip = { x: PIVOT.x + Math.sin(rad) * ARM * 0.35, y: PIVOT.y - Math.cos(rad) * ARM };
  const power = shot ? (shot.depth - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN) : pull ? 0 : null;
  const ball = flying ? arcPoint(flying.from, flying.to, flying.t) : null;

  return (
    <g className="catapult">
      {shot && showLanding && (
        <>
          <path d={arcPathD(CATAPULT, shot.landing)} className="cat-arc" />
          <ellipse cx={shot.landing.x} cy={shot.landing.y} rx={26} ry={12} className="cat-landing" />
        </>
      )}
      {shot && !showLanding && (
        // 着地点は見せず、向きだけ短い線で見せる
        <line
          x1={CATAPULT.x}
          y1={CATAPULT.y}
          x2={CATAPULT.x + Math.sin((shot.angleDeg * Math.PI) / 180) * 110}
          y2={CATAPULT.y - Math.cos((shot.angleDeg * Math.PI) / 180) * 110}
          className="cat-dir"
        />
      )}
      {/* 台と車輪 */}
      <rect x={PIVOT.x - 46} y={PIVOT.y - 4} width={92} height={14} rx={5} className="cat-base" />
      <circle cx={PIVOT.x - 32} cy={PIVOT.y + 10} r={8} className="cat-wheel" />
      <circle cx={PIVOT.x + 32} cy={PIVOT.y + 10} r={8} className="cat-wheel" />
      {/* うでと弾を入れるかご */}
      <line x1={PIVOT.x} y1={PIVOT.y} x2={tip.x} y2={tip.y} className="cat-arm" />
      <path d={`M${tip.x - 15} ${tip.y - 6} Q${tip.x} ${tip.y + 12} ${tip.x + 15} ${tip.y - 6}`} className="cat-bucket" />
      {loaded && <circle cx={tip.x} cy={tip.y - 6} r={BALL} className="cat-ball" />}
      {/* ひっぱりの強さ（遠さ） */}
      {power !== null && (
        <g transform={`translate(${PIVOT.x + 64} ${PIVOT.y + 14})`}>
          <rect x={0} y={-90} width={14} height={90} rx={7} className="cat-power-bg" />
          <rect x={0} y={-90 * power} width={14} height={90 * power} rx={7} className="cat-power" />
        </g>
      )}
      {ball && (
        <>
          <ellipse cx={ball.groundX} cy={ball.groundY} rx={BALL * 1.1} ry={BALL * 0.45} className="cat-shadow" />
          <circle cx={ball.x} cy={ball.y} r={BALL * ball.scale} className="cat-ball" />
        </>
      )}
    </g>
  );
}
