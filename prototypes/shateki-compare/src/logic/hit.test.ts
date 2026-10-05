import { describe, expect, it } from 'vitest';
import { assistMultiplier, FIELD_W, hitTest, layoutTargets, swayOffset, targetPosition, UNIFORM_RADIUS } from './hit';
import type { Problem } from './types';

describe('assistMultiplier', () => {
  it('残り3発は補正なし、2発は中、1発は大', () => {
    expect(assistMultiplier(3, 1)).toBe(1);
    expect(assistMultiplier(2, 1)).toBeGreaterThan(1);
    expect(assistMultiplier(1, 1)).toBeGreaterThan(assistMultiplier(2, 1));
  });
  it('強さ 0 なら常に補正なし、強いほど広がる', () => {
    expect(assistMultiplier(1, 0)).toBe(1);
    expect(assistMultiplier(1, 2)).toBeGreaterThan(assistMultiplier(1, 1));
  });
});

describe('hitTest', () => {
  const circles = [
    { id: 'a', x: 100, y: 100, r: 50 },
    { id: 'b', x: 200, y: 100, r: 50 },
  ];
  it('円の中なら当たり', () => {
    expect(hitTest({ x: 110, y: 100 }, circles)).toBe('a');
  });
  it('どの円にも入らなければ外れ', () => {
    expect(hitTest({ x: 150, y: 300 }, circles)).toBeNull();
  });
  it('重なったら中心に近いほう', () => {
    expect(hitTest({ x: 160, y: 100 }, circles, 2)).toBe('b');
  });
  it('補正で広がった分だけ当たるようになる', () => {
    expect(hitTest({ x: 100, y: 170 }, circles)).toBeNull();
    expect(hitTest({ x: 100, y: 170 }, circles, 1.5)).toBe('a');
  });
});

describe('layoutTargets / targetPosition', () => {
  const p: Problem = {
    id: 'l',
    set: 'risk',
    stage: 1,
    goal: 10,
    shots: 3,
    targets: [
      { id: 't1', op: '+', value: 5, size: 'L', moving: false },
      { id: 't2', op: '+', value: 25, size: 'S', moving: true },
      { id: 't3', op: '+', value: 10, size: 'L', moving: false },
      { id: 't4', op: '+', value: 15, size: 'M', moving: false },
      { id: 't5', op: '+', value: 5, size: 'L', moving: false },
    ],
  };
  it('A/B は全部同じ大きさで止まっている', () => {
    const placed = layoutTargets(p, { riskMode: false });
    expect(placed.every((t) => t.r === UNIFORM_RADIUS && t.amp === 0)).toBe(true);
  });
  it('C は大きさが違い、動く的は奥の段', () => {
    const placed = layoutTargets(p, { riskMode: true });
    const moving = placed.find((t) => t.id === 't2')!;
    const big = placed.find((t) => t.id === 't1')!;
    expect(moving.r).toBeLessThan(big.r);
    expect(moving.amp).toBeGreaterThan(0);
    expect(moving.y).toBeLessThan(Math.max(...placed.map((t) => t.y)));
  });
  it('的はフィールドの中に収まり、動いても隣と重ならない', () => {
    const placed = layoutTargets(p, { riskMode: true, sizeScale: 1.5 });
    for (const t of placed) {
      expect(t.x - t.amp - t.r).toBeGreaterThanOrEqual(0);
      expect(t.x + t.amp + t.r).toBeLessThanOrEqual(FIELD_W);
    }
  });
  it('速さ 0 なら止まる', () => {
    const t = layoutTargets(p, { riskMode: true }).find((x) => x.id === 't2')!;
    expect(targetPosition(t, 1.23, 0)).toEqual({ x: t.x, y: t.y });
    expect(targetPosition(t, 1.23, 1).x).not.toBe(t.x);
  });
  it('揺れは振幅の範囲内', () => {
    for (let t = 0; t < 5; t += 0.1) {
      const { dx, dy } = swayOffset(t, 10);
      expect(Math.abs(dx)).toBeLessThanOrEqual(10);
      expect(Math.abs(dy)).toBeLessThanOrEqual(10);
    }
  });
});
