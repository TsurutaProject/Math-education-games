import type { Problem, TargetSize } from './types';

/** フィールドの論理サイズ（SVG の viewBox と同じ）。 */
export const FIELD_W = 1000;
export const FIELD_H = 560;

/** A/B の的の半径（全部同じ大きさ）。 */
export const UNIFORM_RADIUS = 54;
/** C の的の半径（大きさの倍率をかける前）。 */
export const SIZE_RADIUS: Record<TargetSize, number> = { L: 66, M: 50, S: 34 };

export interface PlacedTarget {
  id: string;
  /** 止まっているときの中心 */
  x: number;
  y: number;
  r: number;
  /** 左右に動く幅（0 なら止まっている） */
  amp: number;
  phase: number;
}

export interface LayoutOptions {
  /** true なら size/moving を使う（C）。false なら全部同じ大きさで止まっている（A/B）。 */
  riskMode: boolean;
  sizeScale?: number;
}

const ROW_Y_ONE = [300];
const ROW_Y_TWO = [205, 405];

/** 的を棚に並べる。的が5個以上なら2段。C では動く的を奥の段に置く。 */
export function layoutTargets(problem: Problem, opts: LayoutOptions): PlacedTarget[] {
  const scale = opts.sizeScale ?? 1;
  const list = opts.riskMode
    ? [...problem.targets].sort((a, b) => Number(!!b.moving) - Number(!!a.moving))
    : [...problem.targets];
  const rows = list.length > 4 ? 2 : 1;
  const perRow = Math.ceil(list.length / rows);
  const rowYs = rows === 1 ? ROW_Y_ONE : ROW_Y_TWO;
  const placed: PlacedTarget[] = [];
  list.forEach((t, i) => {
    const row = Math.floor(i / perRow);
    const inRow = row === rows - 1 ? list.length - perRow * row : perRow;
    const col = i - row * perRow;
    const cell = FIELD_W / inRow;
    const x = cell * (col + 0.5);
    const r = opts.riskMode ? SIZE_RADIUS[t.size ?? 'M'] * scale : UNIFORM_RADIUS;
    const amp = opts.riskMode && t.moving ? Math.max(0, cell / 2 - r - 8) : 0;
    placed.push({ id: t.id, x, y: rowYs[row], r, amp, phase: i * 1.7 });
  });
  return placed;
}

/** 時刻 t（秒）での的の中心。speed は移動速度の倍率（0 で止まる）。 */
export function targetPosition(p: PlacedTarget, t: number, speed: number): { x: number; y: number } {
  if (p.amp === 0 || speed === 0) return { x: p.x, y: p.y };
  return { x: p.x + p.amp * Math.sin(2 * Math.PI * 0.3 * speed * t + p.phase), y: p.y };
}

/**
 * 残りの弾が少ないほど当たり判定を広げる倍率。
 * 残り3発以上は補正なし、2発は中、1発は大。strength=0 で補正なし、1 が標準。
 */
export function assistMultiplier(shotsLeft: number, strength: number): number {
  const k = shotsLeft >= 3 ? 0 : shotsLeft === 2 ? 0.35 : 0.8;
  return 1 + Math.max(0, strength) * k;
}

/** 照準の揺れ（リサジュー曲線）。amplitude はフィールド単位。 */
export function swayOffset(t: number, amplitude: number): { dx: number; dy: number } {
  return {
    dx: amplitude * Math.sin(2 * Math.PI * 0.55 * t),
    dy: amplitude * 0.8 * Math.sin(2 * Math.PI * 0.85 * t + 1.1),
  };
}

export interface HitCircle {
  id: string;
  x: number;
  y: number;
  r: number;
}

/**
 * 照準点に当たる的を返す（なければ null）。
 * 補正後の半径の内側にある的のうち、半径で割った距離がいちばん近いもの。
 */
export function hitTest(
  point: { x: number; y: number },
  circles: ReadonlyArray<HitCircle>,
  multiplier = 1,
): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of circles) {
    const reach = c.r * multiplier;
    const d = Math.hypot(point.x - c.x, point.y - c.y);
    if (d > reach) continue;
    const score = d / reach;
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}
