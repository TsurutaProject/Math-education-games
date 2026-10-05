import { describe, expect, it } from 'vitest';
import { FIELD_W, layoutTargets } from './hit';
import { ALL_PROBLEMS } from './problems';
import {
  advanceBall,
  BALL_R,
  collide,
  guidePath,
  isDirectlyReachable,
  LAUNCHER,
  launchBall,
  launchFromPull,
  MAX_ANGLE_DEG,
  MAX_PULL,
  stepBall,
} from './sling';

describe('launchFromPull', () => {
  it('真下に引くと真上に飛ぶ', () => {
    expect(launchFromPull(0, 100)?.angleDeg).toBeCloseTo(0);
  });
  it('左下に引くと右上に飛ぶ', () => {
    expect(launchFromPull(-100, 100)?.angleDeg).toBeCloseTo(45);
  });
  it('右下に引くと左上に飛ぶ', () => {
    expect(launchFromPull(100, 100)?.angleDeg).toBeCloseTo(-45);
  });
  it('短すぎる引っ張りは撃たない', () => {
    expect(launchFromPull(5, 10)).toBeNull();
  });
  it('上に引いても下には飛ばず、横向きの上限で止まる', () => {
    expect(Math.abs(launchFromPull(-50, -100)!.angleDeg)).toBe(MAX_ANGLE_DEG);
  });
  it('引っ張りの長さには上限がある', () => {
    expect(launchFromPull(0, 1000)!.pull).toBe(MAX_PULL);
  });
});

describe('advanceBall', () => {
  it('まっすぐ上に進み、上から出たら exited', () => {
    let b = launchBall(0, 1000);
    let exited = false;
    for (let i = 0; i < 100 && !exited; i++) ({ ball: b, exited } = advanceBall(b, 0.01, true));
    expect(exited).toBe(true);
    expect(b.x).toBeCloseTo(LAUNCHER.x);
  });
  it('壁ではね返る', () => {
    const r = advanceBall({ x: FIELD_W - BALL_R - 1, y: 300, vx: 500, vy: -100, bounces: 0 }, 0.02, true);
    expect(r.ball.vx).toBe(-500);
    expect(r.ball.bounces).toBe(1);
    expect(r.ball.x).toBeLessThan(FIELD_W - BALL_R);
  });
  it('はね返りなしなら横から出る', () => {
    const r = advanceBall({ x: FIELD_W - 2, y: 300, vx: 1000, vy: 0, bounces: 0 }, 0.05, false);
    expect(r.exited).toBe(true);
  });
});

describe('collide / stepBall', () => {
  const circles = [
    { id: 'a', x: 500, y: 200, r: 40 },
    { id: 'b', x: 200, y: 200, r: 40 },
  ];
  it('的の半径 + 弾の半径の内側で当たる', () => {
    expect(collide({ x: 500 + 40 + BALL_R - 1, y: 200 }, circles)).toBe('a');
    expect(collide({ x: 500 + 40 + BALL_R + 1, y: 200 }, circles)).toBeNull();
  });
  it('補正倍率で当たり判定が広がる', () => {
    expect(collide({ x: 500 + 60, y: 200 }, circles, 1.5)).toBe('a');
  });
  it('速い弾でも1フレームで的をすり抜けない', () => {
    const ball = { x: 500, y: 400, vx: 0, vy: -3000, bounces: 0 };
    const r = stepBall(ball, 0.1, circles, { bounce: true });
    expect(r.hit).toBe('a');
  });
  it('最初に触れた的で止まる（奥の的には届かない）', () => {
    const line = [
      { id: 'near', x: 500, y: 400, r: 40 },
      { id: 'far', x: 500, y: 200, r: 40 },
    ];
    const r = stepBall(launchBall(0, 2000), 0.5, line, { bounce: true });
    expect(r.hit).toBe('near');
  });
});

describe('guidePath', () => {
  it('はね返りありなら折れ点ができる', () => {
    const path = guidePath(70, 1200, true);
    expect(path.length).toBeGreaterThan(2);
    expect(path.every((p) => p.x >= 0 && p.x <= FIELD_W)).toBe(true);
  });
  it('まっすぐなら始点と終点だけで、長さはおよそ指定どおり', () => {
    const path = guidePath(0, 200, true);
    expect(path).toHaveLength(2);
    expect(LAUNCHER.y - path[1].y).toBeCloseTo(200, -1);
  });
});

describe('パチンコの的の並び（1段）', () => {
  it('2段だと手前の的が奥の的をふさぐことがある（1段にした理由）', () => {
    const p = ALL_PROBLEMS.find((x) => x.id === 'risk-1-1')!;
    const placed = layoutTargets(p, { riskMode: true });
    expect(placed.some((t) => !isDirectlyReachable(t.id, placed))).toBe(true);
  });

  it.each(ALL_PROBLEMS.map((p) => [p.id, p] as const))('%s：どの的も、まっすぐ撃てばふさがれずに届く', (_id, p) => {
    for (const sizeScale of [0.6, 1, 1.5]) {
      const placed = layoutTargets(p, { riskMode: p.set === 'risk', sizeScale, singleRow: true });
      for (const t of placed) expect(isDirectlyReachable(t.id, placed), `${t.id} scale=${sizeScale}`).toBe(true);
    }
  });

  it('1段に詰めても的どうしは重ならない', () => {
    for (const p of ALL_PROBLEMS) {
      const placed = layoutTargets(p, { riskMode: p.set === 'risk', sizeScale: 1.5, singleRow: true });
      for (let i = 1; i < placed.length; i++) {
        const a = placed[i - 1];
        const b = placed[i];
        expect(b.x - b.amp - b.r).toBeGreaterThan(a.x + a.amp + a.r);
      }
    }
  });
});
