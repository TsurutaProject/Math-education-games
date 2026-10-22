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

  it('×2 は直前の項にだけかかる（+5 → +10 → ×2 は 5 + 10 × 2 = 25）', () => {
    const q: Problem = {
      ...p,
      targets: [
        { id: 'a', op: '+', value: 5 },
        { id: 'b', op: '+', value: 10 },
        { id: 'x', op: '*', value: 2 },
        { id: 'y', op: '*', value: 2 },
        { id: 'm', op: '-', value: 5 },
      ],
      shots: 5,
    };
    let s = newGame(q);
    for (const id of ['a', 'b', 'x']) s = shoot(q, s, id);
    expect(s.current).toBe(25);
    expect(s.steps.map((st) => st.after)).toEqual([5, 15, 25]);
    // 続けて ×2 を当てると、同じ項にもう一度かかる（5 + 10 × 2 × 2 = 45）
    s = shoot(q, s, 'y');
    expect(s.current).toBe(45);
    // 引き算は新しい項を始める
    s = shoot(q, s, 'm');
    expect(s.current).toBe(40);
  });

  it('引き算の項にも ×2 がかかる（20 − 5 × 2 = 10）', () => {
    const q: Problem = {
      ...p,
      targets: [
        { id: 'a', op: '+', value: 20 },
        { id: 'm', op: '-', value: 5 },
        { id: 'x', op: '*', value: 2 },
      ],
    };
    let s = newGame(q);
    for (const id of ['a', 'm', 'x']) s = shoot(q, s, id);
    expect(s.current).toBe(10);
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
