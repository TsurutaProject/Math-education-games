import { describe, expect, it } from 'vitest';
import { allFound, chooseHint, type HintState } from './hint';
import { START, step, type Calc } from './ops';
import type { Op, Problem } from './types';

/** 例題（解き方は 10+10+20 と 5+15+20 の2通り） */
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

/** 的を順に当てたあとの状態 */
function shot(problem: Problem, ...ids: string[]): HintState {
  let calc: Calc = START;
  const steps: Array<{ op: Op; value: number }> = [];
  for (const id of ids) {
    const t = problem.targets.find((x) => x.id === id)!;
    calc = step(calc, t.op, t.value);
    steps.push({ op: t.op, value: t.value });
  }
  return { calc, usedIds: ids, shotsLeft: problem.shots - ids.length, steps };
}

const found = (...keys: string[]) => new Set(keys);

describe('chooseHint（ヒント #57）', () => {
  it('はじめ：まだ見つけていない解き方を選び、その最初の的を光らせる', () => {
    expect(chooseHint(example, shot(example), found())).toEqual({ kind: 'target', key: '+10,+10,+20', targetId: 't1' });
  });

  it('見つけた解き方は選ばない', () => {
    expect(chooseHint(example, shot(example), found('+10,+10,+20'))).toEqual({ kind: 'target', key: '+5,+15,+20', targetId: 't2' });
  });

  it('途中：いまの式の続きで行ける解き方の、つぎに当てる的', () => {
    const hint = chooseHint(example, shot(example, 't1'), found());
    expect(hint).toEqual({ kind: 'target', key: '+10,+10,+20', targetId: 't3' });
  });

  it('途中：続きで行ける解き方を全部見つけていたら、「さいしょから」を強調する', () => {
    expect(chooseHint(example, shot(example, 't1'), found('+10,+10,+20'))).toEqual({ kind: 'restart' });
  });

  it('途中：もう届かないときも「さいしょから」', () => {
    // 5 + 10 = 15 で、残り1発では 40 に届かない
    expect(chooseHint(example, shot(example, 't2', 't1'), found())).toEqual({ kind: 'restart' });
  });

  it('全部見つけていたら none（ボタンは押せない）', () => {
    expect(chooseHint(example, shot(example), found('+10,+10,+20', '+5,+15,+20'))).toEqual({ kind: 'none' });
    expect(allFound(example, found('+10,+10,+20'))).toBe(false);
    expect(allFound(example, found('+10,+10,+20', '+5,+15,+20'))).toBe(true);
  });

  it('前に選んだ解き方にまだ行けて、まだ見つけていなければ、同じ解き方を続ける', () => {
    expect(chooseHint(example, shot(example), found(), { previousKey: '+5,+15,+20' })).toEqual({ kind: 'target', key: '+5,+15,+20', targetId: 't2' });
    // 5 を当てたあとも同じ道（つぎは 20 か 15）
    expect(chooseHint(example, shot(example, 't2'), found(), { previousKey: '+5,+15,+20' })).toMatchObject({ key: '+5,+15,+20' });
  });

  it('前に選んだ解き方を見つけた・行けなくなったら、ほかの解き方にする', () => {
    expect(chooseHint(example, shot(example), found('+5,+15,+20'), { previousKey: '+5,+15,+20' })).toMatchObject({ key: '+10,+10,+20' });
    expect(chooseHint(example, shot(example, 't1'), found(), { previousKey: '+5,+15,+20' })).toMatchObject({ key: '+10,+10,+20' });
  });

  it('マイナスを通らない順番の的を光らせる（D・E はマイナスにする札を出さない）', () => {
    const p: Problem = {
      ...example,
      goal: 5,
      shots: 2,
      targets: [
        { id: 'x', op: '-', value: 5 },
        { id: 'y', op: '+', value: 10 },
      ],
    };
    expect(chooseHint(p, shot(p), found())).toMatchObject({ kind: 'target', targetId: 'y' });
    expect(chooseHint(p, shot(p), found(), { nonNegativeOnly: true })).toMatchObject({ kind: 'target', targetId: 'y' });
    // 0 → 10 → 5 の道しかない状態から −5 を先に撃つと、マイナスを通る道しか残らない
    expect(chooseHint(p, shot(p, 'x'), found())).toMatchObject({ kind: 'target', targetId: 'y' });
    expect(chooseHint(p, shot(p, 'x'), found(), { nonNegativeOnly: true })).toEqual({ kind: 'restart' });
  });
});
