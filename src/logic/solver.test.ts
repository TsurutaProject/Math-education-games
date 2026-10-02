import { describe, expect, it } from 'vitest';
import { canReach, distinctSolutions, enumerateSolutions } from './solver';
import type { Problem } from './types';

const example: Problem = {
  id: 'ex',
  set: 'standard',
  stage: 1,
  goal: 40,
  shots: 3,
  targets: [
    { id: 't1', op: '+', value: 10 },
    { id: 't2', op: '+', value: 5 },
    { id: 't3', op: '+', value: 20 },
    { id: 't4', op: '+', value: 10 },
    { id: 't5', op: '+', value: 15 },
  ],
};

describe('enumerateSolutions / distinctSolutions', () => {
  it('例題は 10+10+20 と 5+15+20 の2通り', () => {
    const keys = [...distinctSolutions(example).keys()].sort();
    expect(keys).toEqual(['+10,+10,+20', '+5,+15,+20']);
  });

  it('撃つ順番はすべて列挙する（10+10+20 は 3!=6 通り、5+15+20 も 6 通り）', () => {
    expect(enumerateSolutions(example)).toHaveLength(12);
  });

  it('目標に届いた時点で打ち切る（それ以上撃った道は数えない）', () => {
    const p: Problem = {
      ...example,
      goal: 10,
      targets: [
        { id: 'a', op: '+', value: 5 },
        { id: 'b', op: '+', value: 5 },
        { id: 'c', op: '*', value: 2 },
      ],
    };
    const sols = enumerateSolutions(p);
    // 途中で 10 になった道の先（5+5 のあとに ×2 など）は数えない
    for (const s of sols) {
      let v = 0;
      for (const t of s.targets.slice(0, -1)) {
        v = t.op === '+' ? v + t.value : v * t.value;
        expect(v).not.toBe(10);
      }
    }
    expect(new Set(sols.map((s) => s.key))).toEqual(new Set(['+5,+5', '+5|*2']));
  });

  it('弾数より多くは撃たない', () => {
    expect(enumerateSolutions({ ...example, shots: 2 })).toHaveLength(0);
  });

  it('マイナスを通る撃ち方には印がつく', () => {
    const p: Problem = {
      ...example,
      goal: 10,
      targets: [
        { id: 'a', op: '-', value: 5 },
        { id: 'b', op: '*', value: 2 },
        { id: 'c', op: '+', value: 20 },
      ],
    };
    const neg = enumerateSolutions(p).find((s) => s.targets.map((t) => t.id).join() === 'a,b,c');
    expect(neg?.nonNegative).toBe(false);
  });
});

describe('canReach（途中から届くか）', () => {
  it('最初からなら届く', () => {
    expect(canReach(example, 0, [], 3)).toBe(true);
  });
  it('10 を撃って残り2発なら、10+20 で届く', () => {
    expect(canReach(example, 10, ['t1'], 2)).toBe(true);
  });
  it('5 と 10 を撃って残り1発（今 15）なら届かない', () => {
    expect(canReach(example, 15, ['t2', 't1'], 1)).toBe(false);
  });
  it('20 を撃ってしまっても、10+10 なら届く', () => {
    expect(canReach(example, 20, ['t3'], 2)).toBe(true);
  });
  it('外れで弾だけ減った場合も判定できる', () => {
    expect(canReach(example, 0, [], 1)).toBe(false);
  });
  it('すでに目標なら true', () => {
    expect(canReach(example, 40, ['t1', 't3', 't4'], 0)).toBe(true);
  });
});
