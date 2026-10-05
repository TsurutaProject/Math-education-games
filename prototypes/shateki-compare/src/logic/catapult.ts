import { FIELD_H, FIELD_W } from './hit';
import { clampAngle, launchFromPull, MAX_PULL, MIN_PULL } from './sling';

/**
 * カタパルト（引っ張る長さで飛ぶ距離が決まり、山なりに飛んで着地点で当たる）の計算。
 * 引く向きで左右、引く長さで「どれだけ奥（画面の上）に落ちるか」が決まる。
 * 手前の的は飛び越えるので、2段の棚でも奥の的をねらえる。
 */

/** 弾を乗せる位置（カタパルトのうでの先） */
export const CATAPULT = { x: FIELD_W / 2, y: FIELD_H - 50 };
/** いちばん短く引いたときの飛ぶ距離（発射位置からの高さの差） */
export const DEPTH_MIN = 90;
/** いちばん長く引いたときの飛ぶ距離 */
export const DEPTH_MAX = 470;

export interface CatapultShot {
  /** 真上が 0 度、右が + */
  angleDeg: number;
  pull: number;
  /** 発射位置から着地点までの高さの差（大きいほど奥） */
  depth: number;
  landing: { x: number; y: number };
}

/** 引っ張った長さ → 飛ぶ距離。長く引くほど遠く（奥）に落ちる。 */
export function depthFromPull(pull: number): number {
  const k = Math.max(0, Math.min(1, (pull - MIN_PULL) / (MAX_PULL - MIN_PULL)));
  return DEPTH_MIN + k * (DEPTH_MAX - DEPTH_MIN);
}

/** 飛ぶ距離 → 引っ張る長さ（depthFromPull の逆） */
export function pullForDepth(depth: number): number {
  const k = (depth - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN);
  return MIN_PULL + k * (MAX_PULL - MIN_PULL);
}

/** 向きと距離から着地点を出す（ねらいの線の上で、高さの差が depth の点） */
export function landingPoint(angleDeg: number, depth: number, from = CATAPULT): { x: number; y: number } {
  return { x: from.x + Math.tan((angleDeg * Math.PI) / 180) * depth, y: from.y - depth };
}

/**
 * 引っ張り（押した点 → 今の指）からねらいを決める。短すぎるときは null（撃たない）。
 * jitter は照準の揺れ（向きのぶれ・距離のぶれ）。
 */
export function aimCatapult(dx: number, dy: number, jitter = { angle: 0, depth: 0 }): CatapultShot | null {
  const l = launchFromPull(dx, dy);
  if (!l) return null;
  const angleDeg = clampAngle(l.angleDeg + jitter.angle);
  const depth = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, depthFromPull(l.pull) + jitter.depth));
  return { angleDeg, pull: l.pull, depth, landing: landingPoint(angleDeg, depth) };
}

/** 飛んでいる時間（秒）。遠いほど少し長い。baseSec は設定の値。 */
export function flightDuration(depth: number, baseSec: number): number {
  return baseSec * (0.6 + (0.4 * depth) / DEPTH_MAX);
}

/** 着地点に的の中心をのせるための、向きと距離（届かないときは null） */
export function aimFor(target: { x: number; y: number }, from = CATAPULT): { angleDeg: number; depth: number } | null {
  const depth = from.y - target.y;
  if (depth < DEPTH_MIN || depth > DEPTH_MAX) return null;
  const angleDeg = (Math.atan2(target.x - from.x, depth) * 180) / Math.PI;
  if (clampAngle(angleDeg) !== angleDeg) return null;
  return { angleDeg, depth };
}

/**
 * 山なりの途中の位置（t は 0〜1）。
 * ground は地面に落ちる影の位置（着地点に向かってまっすぐ進む）、x,y は弾の見た目の位置。
 * scale は手前に来るほど大きく見せる倍率。
 */
export function arcPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
): { x: number; y: number; groundX: number; groundY: number; scale: number } {
  const k = Math.max(0, Math.min(1, t));
  const groundX = from.x + (to.x - from.x) * k;
  const groundY = from.y + (to.y - from.y) * k;
  const bump = 4 * k * (1 - k);
  const height = 120 + 0.45 * Math.hypot(to.x - from.x, to.y - from.y);
  return { x: groundX, y: groundY - height * bump, groundX, groundY, scale: 1 + 0.7 * bump };
}
