import { describe, expect, it } from 'vitest';
import { analyzeProblem, createRng, generateProblem, isEasyTarget, validateProblem } from './generator';
import { ALL_PROBLEMS, problemsFor } from './problems';

describe('問題データ（problems.json）', () => {
  it('standard と risk、それぞれステージ1・2に3問ずつ', () => {
    for (const set of ['standard', 'risk'] as const) {
      for (const stage of [1, 2]) expect(problemsFor(set, stage)).toHaveLength(3);
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

  it.each(problemsFor('risk', 1).concat(problemsFor('risk', 2)).map((p) => [p.id, p] as const))(
    '%s：当てやすい的だけで届く「安全な道」がある',
    (_id, p) => {
      const a = analyzeProblem(p);
      expect(a.hasSafePath).toBe(true);
      expect(p.targets.filter(isEasyTarget).length).toBeGreaterThanOrEqual(p.shots);
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
    ['risk', 1],
    ['risk', 2],
  ] as const)('%s ステージ%i：いろいろなシードで条件を満たす問題ができる', (set, stage) => {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generateProblem(createRng(seed), { set, stage, id: 'x' });
      expect(p).not.toBeNull();
      expect(validateProblem(p!)).toEqual([]);
    }
  });
});
