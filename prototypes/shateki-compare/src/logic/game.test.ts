import { describe, expect, it } from 'vitest';
import { newGame, remaining, shoot } from './game';
import type { Problem } from './types';

const p: Problem = {
  id: 'g',
  set: 'standard',
  stage: 1,
  goal: 40,
  shots: 3,
  targets: [
    { id: 't1', op: '+', value: 10 },
    { id: 't2', op: '+', value: 5 },
    { id: 't3', op: '+', value: 20 },
    { id: 't4', op: '+', value: 10 },
  ],
};

describe('shoot', () => {
  it('当たると演算が適用され、弾が減る', () => {
    const s = shoot(p, newGame(p), 't3');
    expect(s.current).toBe(20);
    expect(s.shotsLeft).toBe(2);
    expect(s.usedIds).toEqual(['t3']);
    expect(remaining(p, s)).toBe(20);
  });

  it('同じ的は2回撃てない', () => {
    const s1 = shoot(p, newGame(p), 't1');
    const s2 = shoot(p, s1, 't1');
    expect(s2).toBe(s1);
  });

  it('外れは弾だけ減る', () => {
    const s = shoot(p, newGame(p), null);
    expect(s.current).toBe(0);
    expect(s.shotsLeft).toBe(2);
  });

  it('目標に一致した瞬間にクリア（弾が残っていてもよい）', () => {
    const p2 = { ...p, goal: 30 };
    let s = shoot(p2, newGame(p2), 't1');
    s = shoot(p2, s, 't3');
    expect(s.status).toBe('cleared');
    expect(s.shotsLeft).toBe(1);
    expect(shoot(p2, s, 't4')).toBe(s);
  });

  it('弾を使い切って届かなければ out、差がわかる', () => {
    let s = newGame(p);
    s = shoot(p, s, 't1');
    s = shoot(p, s, 't2');
    s = shoot(p, s, null);
    expect(s.status).toBe('out');
    expect(remaining(p, s)).toBe(25);
  });

  it('超えた場合は差が負になる', () => {
    let s = newGame(p);
    s = shoot(p, s, 't3');
    s = shoot(p, s, 't1');
    s = shoot(p, s, 't4');
    expect(s.current).toBe(40);
    expect(s.status).toBe('cleared');
    const p3 = { ...p, goal: 35 };
    let s3 = newGame(p3);
    for (const id of ['t3', 't1', 't4']) s3 = shoot(p3, s3, id);
    expect(remaining(p3, s3)).toBe(-5);
  });
});
