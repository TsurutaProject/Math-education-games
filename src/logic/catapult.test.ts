import { describe, expect, it } from 'vitest';
import {
  aimCatapult,
  aimFor,
  arcPoint,
  CATAPULT,
  DEPTH_MAX,
  DEPTH_MIN,
  depthFromPull,
  flightDuration,
  landingPoint,
  pullForDepth,
} from './catapult';
import { layoutTargets } from './hit';
import { ALL_PROBLEMS } from './problems';
import { MAX_PULL, MIN_PULL } from './sling';

describe('引っ張る長さと飛ぶ距離', () => {
  it('長く引くほど遠く（画面の上）に落ちる', () => {
    const near = aimCatapult(0, 40)!;
    const far = aimCatapult(0, 130)!;
    expect(far.depth).toBeGreaterThan(near.depth);
    expect(far.landing.y).toBeLessThan(near.landing.y);
  });
  it('距離は最小〜最大の範囲に収まる', () => {
    expect(depthFromPull(MIN_PULL)).toBe(DEPTH_MIN);
    expect(depthFromPull(MAX_PULL)).toBe(DEPTH_MAX);
    expect(depthFromPull(10_000)).toBe(DEPTH_MAX);
  });
  it('pullForDepth は depthFromPull の逆', () => {
    expect(depthFromPull(pullForDepth(300))).toBeCloseTo(300);
  });
  it('短く引いただけなら撃たない', () => {
    expect(aimCatapult(3, 5)).toBeNull();
  });
  it('左下に引くと右に、右下に引くと左に落ちる', () => {
    expect(aimCatapult(-60, 80)!.landing.x).toBeGreaterThan(CATAPULT.x);
    expect(aimCatapult(60, 80)!.landing.x).toBeLessThan(CATAPULT.x);
  });
  it('揺れで向きと距離が少しぶれる', () => {
    const a = aimCatapult(0, 100)!;
    const b = aimCatapult(0, 100, { angle: 2, depth: 10 })!;
    expect(b.landing.x).toBeGreaterThan(a.landing.x);
    expect(b.depth).toBeCloseTo(a.depth + 10);
  });
});

describe('aimFor / landingPoint', () => {
  it('aimFor で決めた向きと距離なら、ちょうどその点に落ちる', () => {
    const target = { x: 220, y: 205 };
    const aim = aimFor(target)!;
    const p = landingPoint(aim.angleDeg, aim.depth);
    expect(p.x).toBeCloseTo(target.x);
    expect(p.y).toBeCloseTo(target.y);
  });

  it.each(ALL_PROBLEMS.map((p) => [p.id, p] as const))('%s：2段の棚のどの的にも落とせる', (_id, p) => {
    for (const sizeScale of [0.6, 1, 1.5]) {
      for (const t of layoutTargets(p, { riskMode: p.set === 'risk', sizeScale })) {
        expect(aimFor(t), `${t.id}`).not.toBeNull();
      }
    }
  });
});

describe('arcPoint / flightDuration', () => {
  const from = CATAPULT;
  const to = { x: 300, y: 200 };
  it('始まりと終わりは地面の上', () => {
    expect(arcPoint(from, to, 0)).toMatchObject({ x: from.x, y: from.y, scale: 1 });
    expect(arcPoint(from, to, 1)).toMatchObject({ x: to.x, y: to.y, scale: 1 });
  });
  it('途中は影より高く（画面の上に）ある', () => {
    const m = arcPoint(from, to, 0.5);
    expect(m.y).toBeLessThan(m.groundY);
    expect(m.scale).toBeGreaterThan(1);
  });
  it('遠いほど長く飛ぶ', () => {
    expect(flightDuration(DEPTH_MAX, 0.8)).toBeGreaterThan(flightDuration(DEPTH_MIN, 0.8));
    expect(flightDuration(DEPTH_MAX, 0.8)).toBeCloseTo(0.8);
  });
});
