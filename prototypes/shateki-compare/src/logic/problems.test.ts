import { describe, expect, it } from 'vitest';
import { analyzeProblem, createRng, generateProblem, hasDuplicateCard, isEasyTarget, validateProblem } from './generator';
import { allNodes, setForVariant } from './course';
import { ALL_PROBLEMS, problemById, problemsFor } from './problems';
import { START, step, valueOf, type Calc } from './ops';
import type { Problem, Target } from './types';

const bySet = (set: Problem['set']) => ALL_PROBLEMS.filter((p) => p.set === set);

describe('問題データ（problems.json）', () => {
  it('コースの表に出てくる問題がそろっていて、それ以外の問題はない', () => {
    const ids = allNodes().map((n) => n.node.problemId);
    expect(ALL_PROBLEMS.map((p) => p.id).sort()).toEqual([...ids].sort());
  });

  it('コースのどの問題も、そのステージ・その遊び方用の問題', () => {
    for (const { stage, node } of allNodes()) {
      const p = problemById(node.problemId)!;
      expect(p.stage).toBe(stage);
      expect(p.set).toBe(setForVariant(node.variant));
    }
  });

  it('問題 id は重複しない', () => {
    expect(new Set(ALL_PROBLEMS.map((p) => p.id)).size).toBe(ALL_PROBLEMS.length);
  });

  it('standard ステージ1の1問目は依頼の例そのまま', () => {
    const p = problemsFor('standard', 1)[0];
    expect(p.goal).toBe(40);
    expect(p.shots).toBe(3);
    expect(p.targets.map((t) => `${t.op}${t.value}`)).toEqual(['+10', '+5', '+20', '+10', '+15']);
  });

  it.each(ALL_PROBLEMS.map((p) => [p.id, p] as const))('%s：異なる解き方が2つ以上あり、条件をすべて満たす', (_id, p) => {
    expect(analyzeProblem(p).keys.length).toBeGreaterThanOrEqual(2);
    expect(validateProblem(p)).toEqual([]);
  });

  it.each(bySet('risk').map((p) => [p.id, p] as const))(
    '%s：当てやすい的だけで届く「安全な道」がある',
    (_id, p) => {
      const a = analyzeProblem(p);
      expect(a.hasSafePath).toBe(true);
      expect(p.targets.filter(isEasyTarget).length).toBeGreaterThanOrEqual(p.shots);
    },
  );

  it.each(bySet('rise').map((p) => [p.id, p] as const))(
    '%s：札は8枚で、同じ札が2枚ない（E 用。6つ立てて、2枚は起き上がりで出る）',
    (_id, p) => {
      expect(p.targets).toHaveLength(8);
      expect(hasDuplicateCard(p.targets)).toBe(false);
    },
  );

  it.each(bySet('lane').map((p) => [p.id, p] as const))(
    '%s：同じ札が2枚ない（D 用）',
    (_id, p) => {
      expect(hasDuplicateCard(p.targets)).toBe(false);
    },
  );
});

describe('validateProblem', () => {
  it('1発で目標になる的があれば、×2 を先に撃つ道で隠れていても見つける', () => {
    const errors = validateProblem({
      id: 'x',
      set: 'standard',
      stage: 2,
      goal: 20,
      shots: 3,
      targets: [
        { id: 't1', op: '*', value: 2 },
        { id: 't2', op: '+', value: 20 },
        { id: 't3', op: '+', value: 10 },
        { id: 't4', op: '-', value: 5 },
      ],
    });
    expect(errors).toContain('1発で終わる解き方がある');
  });

  it('lane は同じ札が2枚あると条件を満たさない（+10 と −10 は別の札）', () => {
    const base = { id: 'x', set: 'lane' as const, stage: 2, goal: 40, shots: 3 };
    const dup = validateProblem({
      ...base,
      targets: [
        { id: 't1', op: '+', value: 10 },
        { id: 't2', op: '+', value: 10 },
        { id: 't3', op: '-', value: 10 },
      ],
    });
    expect(dup).toContain('同じ札が2枚以上ある');
    expect(hasDuplicateCard([{ id: 'a', op: '+', value: 10 }, { id: 'b', op: '-', value: 10 }])).toBe(false);
  });

  it('lane は引き算の札が2枚あると条件を満たさない（見えている札を倒さないので、マイナスになりうる）', () => {
    const errors = validateProblem({
      id: 'x',
      set: 'lane',
      stage: 2,
      goal: 40,
      shots: 3,
      targets: [
        { id: 't1', op: '+', value: 20 },
        { id: 't2', op: '+', value: 30 },
        { id: 't3', op: '-', value: 5 },
        { id: 't4', op: '-', value: 10 },
        { id: 't5', op: '*', value: 2 },
      ],
    });
    expect(errors).toContain('引き算の札が2枚以上ある');
  });

  it('lane・rise はマイナスにならない札の出し方で撃てない解き方があると条件を満たさない', () => {
    // 15 − 10 = 5 は、×2 が残っているあいだは −10 が出てこない（15 − 10 × 2 になりうる）ので撃てない
    const p: Problem = {
      id: 'x',
      set: 'lane',
      stage: 2,
      goal: 5,
      shots: 3,
      targets: [
        { id: 't1', op: '+', value: 15 },
        { id: 't2', op: '-', value: 10 },
        { id: 't3', op: '*', value: 2 },
        { id: 't4', op: '+', value: 20 },
        { id: 't5', op: '+', value: 30 },
      ],
    };
    expect(validateProblem(p)).toContain('マイナスにならない札の出し方では撃てない解き方がある');
    expect(validateProblem({ ...p, set: 'rise' })).toContain('マイナスにならない札の出し方では撃てない解き方がある');
  });
});

describe('validateProblem：ステージ（単元）の決まり', () => {
  const base = { id: 'x', set: 'standard' as const, shots: 3 };

  it('ステージ2は + − だけで、引き算を使う解き方がいる', () => {
    const withTimes = validateProblem({
      ...base,
      stage: 2,
      goal: 30,
      targets: [
        { id: 't1', op: '+', value: 10 },
        { id: 't2', op: '+', value: 15 },
        { id: 't3', op: '-', value: 5 },
        { id: 't4', op: '*', value: 2 },
        { id: 't5', op: '+', value: 20 },
      ],
    });
    expect(withTimes).toContain('ステージ2に + − 以外がある');
    const noMinus = validateProblem({
      ...base,
      stage: 2,
      goal: 30,
      targets: [
        { id: 't1', op: '+', value: 10 },
        { id: 't2', op: '+', value: 20 },
        { id: 't3', op: '+', value: 5 },
        { id: 't4', op: '+', value: 25 },
      ],
    });
    expect(noMinus).toContain('ステージ2に引き算の札がない');
  });

  it('ステージ3は × と ÷ の両方がいる。×2・×3・×5、÷2・÷5 だけ', () => {
    const errors = validateProblem({
      ...base,
      stage: 3,
      goal: 20,
      targets: [
        { id: 't1', op: '+', value: 10 },
        { id: 't2', op: '*', value: 4 },
        { id: 't3', op: '+', value: 5 },
        { id: 't4', op: '+', value: 15 },
      ],
    });
    expect(errors).toContain('ステージ3に × と ÷ がそろっていない');
    expect(errors).toContain('×2・×3・×5 以外の掛け算がある');
  });

  it('÷ は1枚まで。+ − の札はどれも ÷ の数で割り切れる（途中で小数にしない）', () => {
    const errors = validateProblem({
      ...base,
      stage: 3,
      goal: 12,
      targets: [
        { id: 't1', op: '+', value: 6 },
        { id: 't2', op: '+', value: 5 },
        { id: 't3', op: '/', value: 2 },
        { id: 't4', op: '/', value: 2 },
        { id: 't5', op: '*', value: 2 },
      ],
    });
    expect(errors).toContain('割り算の札が2枚以上ある');
    expect(errors).toContain('÷ の数で割り切れない + − の札がある');
  });

  it.each(ALL_PROBLEMS.filter((p) => p.stage === 3).map((p) => [p.id, p] as const))('%s：どの順に撃っても途中の数が整数', (_id, p) => {
    // 弾数ぶん、全部の撃ち方をためす
    const walk = (calc: Calc, left: Target[], shots: number): boolean =>
      shots === 0 ||
      left.every((t) => {
        const next = step(calc, t.op, t.value);
        return Number.isInteger(valueOf(next)) && walk(next, left.filter((x) => x !== t), shots - 1);
      });
    expect(walk(START, p.targets, p.shots)).toBe(true);
  });
});

describe('generateProblem', () => {
  it('同じシードなら同じ問題', () => {
    const a = generateProblem(createRng(1), { set: 'standard', stage: 2, id: 'x' });
    const b = generateProblem(createRng(1), { set: 'standard', stage: 2, id: 'x' });
    expect(a).toEqual(b);
  });

  it.each([
    ['standard', 1],
    ['standard', 2],
    ['standard', 3],
    ['risk', 1],
    ['risk', 2],
    ['risk', 3],
    ['lane', 1],
    ['lane', 2],
    ['lane', 3],
    ['rise', 1],
    ['rise', 2],
    ['rise', 3],
  ] as const)('%s ステージ%i：いろいろなシードで条件を満たす問題ができる', (set, stage) => {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generateProblem(createRng(seed), { set, stage, id: 'x' });
      expect(p).not.toBeNull();
      expect(validateProblem(p!)).toEqual([]);
    }
  });
});
