import { FIELD_H, FIELD_W, type HitCircle } from './hit';

/** パチンコ（引っ張って飛ばす射撃タイプ）の計算。描画には依存しない。 */

/** 弾が飛び出す位置（パチンコのゴムの真ん中） */
export const LAUNCHER = { x: FIELD_W / 2, y: FIELD_H - 68 };
export const BALL_R = 11;
/** これより短く引いたら撃たない（タップしただけで弾が減らないように） */
export const MIN_PULL = 24;
/** 引っ張りの最大（これ以上引いても同じ） */
export const MAX_PULL = 140;
/** 真上から左右に何度まで撃てるか */
export const MAX_ANGLE_DEG = 75;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
}

export interface Launch {
  /** 真上が 0 度、右が +、左が − */
  angleDeg: number;
  /** 引っ張った長さ（MAX_PULL まで） */
  pull: number;
}

export function clampAngle(deg: number): number {
  return Math.max(-MAX_ANGLE_DEG, Math.min(MAX_ANGLE_DEG, deg));
}

/**
 * 引っ張った向き（押した点 → 今の指の位置）から、飛ばす向きを決める。
 * 引いた向きと反対に飛ぶ。短すぎるときは null（撃たない）。
 */
export function launchFromPull(dx: number, dy: number): Launch | null {
  const len = Math.hypot(dx, dy);
  if (len < MIN_PULL) return null;
  // 飛ぶ向き = 引いた向きの反対。真上を 0 度にした角度
  const deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
  return { angleDeg: clampAngle(deg), pull: Math.min(len, MAX_PULL) };
}

export function directionOf(angleDeg: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(a), y: -Math.cos(a) };
}

export function launchBall(angleDeg: number, speed: number, from = LAUNCHER): Ball {
  const d = directionOf(angleDeg);
  return { x: from.x, y: from.y, vx: d.x * speed, vy: d.y * speed, bounces: 0 };
}

/**
 * dt 秒だけ弾を進める。bounce なら左右の壁ではね返る。
 * 上（または左右・下）から外に出たら exited。
 */
export function advanceBall(ball: Ball, dt: number, bounce: boolean): { ball: Ball; exited: boolean } {
  let { x, vx, bounces } = ball;
  const y = ball.y + ball.vy * dt;
  x += vx * dt;
  if (bounce) {
    if (x < BALL_R) {
      x = 2 * BALL_R - x;
      vx = -vx;
      bounces += 1;
    } else if (x > FIELD_W - BALL_R) {
      x = 2 * (FIELD_W - BALL_R) - x;
      vx = -vx;
      bounces += 1;
    }
  }
  const exited = y < -BALL_R || y > FIELD_H + BALL_R || x < -BALL_R || x > FIELD_W + BALL_R;
  return { ball: { x, y, vx, vy: ball.vy, bounces }, exited };
}

/**
 * 弾が当たった的（なければ null）。的の半径 × 補正倍率 + 弾の半径 の内側に入ったら当たり。
 * 2つに同時に触れたら、近いほう。
 */
export function collide(ball: { x: number; y: number }, circles: ReadonlyArray<HitCircle>, multiplier = 1): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of circles) {
    const reach = c.r * multiplier + BALL_R;
    const d = Math.hypot(ball.x - c.x, ball.y - c.y);
    if (d > reach) continue;
    const score = d / reach;
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}

/**
 * 1フレーム分を細かく刻んで進め、途中で的に当たるか外に出るかを調べる
 * （速い弾が的をすり抜けないように）。
 */
export function stepBall(
  ball: Ball,
  dt: number,
  circles: ReadonlyArray<HitCircle>,
  opts: { bounce: boolean; multiplier?: number; maxStep?: number },
): { ball: Ball; hit: string | null; exited: boolean } {
  const speed = Math.hypot(ball.vx, ball.vy);
  const n = Math.max(1, Math.ceil((speed * dt) / (opts.maxStep ?? 6)));
  let b = ball;
  for (let i = 0; i < n; i++) {
    const r = advanceBall(b, dt / n, opts.bounce);
    b = r.ball;
    const hit = collide(b, circles, opts.multiplier ?? 1);
    if (hit) return { ball: b, hit, exited: false };
    if (r.exited) return { ball: b, hit: null, exited: true };
  }
  return { ball: b, hit: null, exited: false };
}

/**
 * 発射位置から的の中心へまっすぐ撃ったとき、ほかの的にふさがれずに届くか
 * （的が止まっている位置で判定）。
 */
export function isDirectlyReachable(targetId: string, circles: ReadonlyArray<HitCircle>, from = LAUNCHER): boolean {
  const t = circles.find((c) => c.id === targetId);
  if (!t) return false;
  const vx = t.x - from.x;
  const vy = t.y - from.y;
  const len2 = vx * vx + vy * vy;
  return circles.every((c) => {
    if (c.id === targetId) return true;
    // 線分（発射位置 → 的の中心）と、ほかの的の中心との最短距離
    const k = Math.max(0, Math.min(1, ((c.x - from.x) * vx + (c.y - from.y) * vy) / len2));
    const d = Math.hypot(from.x + vx * k - c.x, from.y + vy * k - c.y);
    return d > c.r + BALL_R;
  });
}

/** ねらいのガイド線（はね返りもふくめた折れ線）。length はガイドの長さ。 */
export function guidePath(angleDeg: number, length: number, bounce: boolean, from = LAUNCHER): Array<{ x: number; y: number }> {
  const points = [{ x: from.x, y: from.y }];
  let b = launchBall(angleDeg, 1, from);
  let travelled = 0;
  const step = 4;
  while (travelled < length) {
    const before = b.bounces;
    const r = advanceBall(b, Math.min(step, length - travelled), bounce);
    b = r.ball;
    travelled += step;
    if (b.bounces !== before) points.push({ x: b.x, y: b.y });
    if (r.exited) break;
  }
  points.push({ x: b.x, y: b.y });
  return points;
}
