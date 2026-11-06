import { playableInLane } from './lane';
import { START, step, valueOf } from './ops';
import { distinctSolutions, enumerateSolutions, type Solution } from './solver';
import type { Op, Problem, ProblemSet, Target, TargetSize } from './types';

/** 図鑑が埋めきれる量にするため、解き方の種類の上限。 */
export const MAX_SOLUTIONS = 6;

/** シード付き乱数（mulberry32）。同じシードなら同じ問題ができる。 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function shuffle<T>(rng: () => number, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** C の的の大きさ：×2 と大きい数は小さい的、小さい数と引き算は大きい的。 */
export function sizeFor(op: Op, value: number): TargetSize {
  if (op === '*' || op === '/') return 'S';
  if (op === '-') return 'L';
  if (value >= 20) return 'S';
  if (value >= 15) return 'M';
  return 'L';
}

/** 当てやすい的（大きくて止まっている）。 */
export function isEasyTarget(t: Target): boolean {
  return t.size === 'L' && !t.moving;
}

export interface ProblemAnalysis {
  keys: string[];
  /** 1発で目標になる的がある */
  hasOneShot: boolean;
  /** すべての解き方が、マイナスを通らない撃ち方で実現できる */
  allNonNegative: boolean;
  usesOps: Set<Op>;
  /** 当てやすい的だけで届く解き方がある（C） */
  hasSafePath: boolean;
  /** 当てにくい的を使って、弾が余る解き方がある（C） */
  hasShortcut: boolean;
  /** すべての解き方が、D の流し方（マイナスにならない札だけ流す）で撃てる順番を持つ */
  allPlayableInLane: boolean;
}

export function analyzeProblem(problem: Problem): ProblemAnalysis {
  const all = enumerateSolutions(problem);
  const sols = [...distinctSolutions(problem, all).values()];
  const usesOps = new Set<Op>();
  for (const s of sols) for (const t of s.targets) usesOps.add(t.op);
  return {
    keys: sols.map((s) => s.key),
    hasOneShot: all.some((s) => s.targets.length === 1),
    allNonNegative: sols.every((s) => s.nonNegative),
    usesOps,
    hasSafePath: sols.some((s) => s.targets.every(isEasyTarget)),
    hasShortcut: sols.some((s) => s.targets.length < problem.shots && s.targets.some((t) => !isEasyTarget(t))),
    allPlayableInLane: keysPlayableInLane(problem, all),
  };
}

/** 解き方（正規化キー）ごとに、D の流し方で撃てる順番が1つ以上あるか */
function keysPlayableInLane(problem: Problem, all: ReadonlyArray<Solution>): boolean {
  const playable = new Set(all.filter((s) => playableInLane(problem, s.targets)).map((s) => s.key));
  return all.every((s) => playable.has(s.key));
}

/**
 * 札を山札から出す問題か（D「ながれる」・E「おきあがる」）。
 * どちらも「マイナスにならない札だけ出す」「見えている札は倒さない」ので、同じ条件をかける。
 */
export function isDeckSet(set: ProblemSet): boolean {
  return set === 'lane' || set === 'rise';
}

/** ステージ 3 で使う掛け算・割り算の数 */
export const TIMES_VALUES = [2, 3, 5] as const;
export const DIVIDE_VALUES = [2, 5] as const;

/**
 * ステージ（単元）ごとの決まり（#52）。1：足し算、2：引き算が入る、3：掛け算・割り算（前のステージの + − も使ってよい）。
 * ÷ の札は1枚まで、+ − の札はどれも ÷ の数で割り切れる数にする。どの順に撃っても、項（+ − の数に × ÷ をかけたもの）が
 * いつも割り切れるので、途中の数が小数にならない（D・E の見えている札を倒さない流し方でも同じ）。
 */
function unitErrors(problem: Problem, a: ProblemAnalysis): string[] {
  const errors: string[] = [];
  const ops = new Set(problem.targets.map((t) => t.op));
  if (problem.stage === 1 && [...ops].some((op) => op !== '+')) errors.push('ステージ1に足し算以外がある');
  if (problem.stage === 2) {
    if ([...ops].some((op) => op !== '+' && op !== '-')) errors.push('ステージ2に + − 以外がある');
    if (!ops.has('-')) errors.push('ステージ2に引き算の札がない');
    if (!a.usesOps.has('-')) errors.push('引き算を使う解き方がない');
  }
  if (problem.stage === 3) {
    if (!ops.has('*') || !ops.has('/')) errors.push('ステージ3に × と ÷ がそろっていない');
    if (problem.targets.some((t) => t.op === '*' && !(TIMES_VALUES as readonly number[]).includes(t.value))) errors.push('×2・×3・×5 以外の掛け算がある');
    if (problem.targets.some((t) => t.op === '/' && !(DIVIDE_VALUES as readonly number[]).includes(t.value))) errors.push('÷2・÷5 以外の割り算がある');
    if (!a.usesOps.has('*')) errors.push('掛け算を使う解き方がない');
    if (!a.usesOps.has('/')) errors.push('割り算を使う解き方がない');
  }
  const divides = problem.targets.filter((t) => t.op === '/');
  if (divides.length > 1) errors.push('割り算の札が2枚以上ある');
  if (problem.targets.some((t) => (t.op === '+' || t.op === '-') && divides.some((d) => t.value % d.value !== 0))) {
    errors.push('÷ の数で割り切れない + − の札がある');
  }
  return errors;
}

/** 問題が条件を満たしているか。満たさない理由を返す（空なら OK）。 */
export function validateProblem(problem: Problem): string[] {
  const errors: string[] = [];
  const deck = isDeckSet(problem.set);
  if (deck && hasDuplicateCard(problem.targets)) errors.push('同じ札が2枚以上ある');
  // D・E は見えている札を倒さないので、引き算が2枚あると、片方を当てたあとにもう片方でマイナスになりうる
  if (deck && problem.targets.filter((t) => t.op === '-').length > 1) errors.push('引き算の札が2枚以上ある');
  const a = analyzeProblem(problem);
  // 図鑑の「？」に、D・E では撃てない解き方が混ざらないようにする
  if (deck && !a.allPlayableInLane) errors.push('マイナスにならない札の出し方では撃てない解き方がある');
  if (problem.targets.length <= problem.shots) errors.push('的の数が弾数以下');
  if (new Set(problem.targets.map((t) => t.id)).size !== problem.targets.length) errors.push('的の id が重複');
  if (a.keys.length < 2) errors.push(`解き方が ${a.keys.length} 種類しかない`);
  if (a.keys.length > MAX_SOLUTIONS) errors.push(`解き方が ${a.keys.length} 種類で多すぎる`);
  if (a.hasOneShot) errors.push('1発で終わる解き方がある');
  if (!a.allNonNegative) errors.push('マイナスを通らないと実現できない解き方がある');
  errors.push(...unitErrors(problem, a));
  if (problem.set === 'risk') {
    if (problem.targets.some((t) => t.size !== sizeFor(t.op, t.value))) errors.push('的の大きさがルールと違う');
    if (problem.targets.some((t) => t.moving && t.size === 'L')) errors.push('大きい的が動いている');
    if (!problem.targets.some((t) => t.moving)) errors.push('動く的がない');
    if (!a.hasSafePath) errors.push('当てやすい的だけで届く道がない');
    if (!a.hasShortcut) errors.push('当てにくい的を使う近道がない');
  }
  return errors;
}

/** 同じ札（演算子＋数）が2枚以上あるか。D では山札に同じ札を入れない。 */
export function hasDuplicateCard(targets: ReadonlyArray<Target>): boolean {
  return new Set(targets.map((t) => `${t.op}${t.value}`)).size !== targets.length;
}

/** list から重ならないように n 個選ぶ */
function pickDistinct<T>(rng: () => number, list: readonly T[], n: number): T[] {
  return shuffle(rng, [...list]).slice(0, n);
}

function makeTargets(specs: Array<[Op, number]>): Target[] {
  return specs.map(([op, value], i) => ({ id: `t${i + 1}`, op, value }));
}

function withRisk(rng: () => number, targets: Target[]): Target[] {
  const sized = targets.map((t) => ({ ...t, size: sizeFor(t.op, t.value), moving: false }));
  const small = sized.filter((t) => t.size === 'S');
  // 小さい的のうち、× ÷ と いちばん大きい数は動かす
  const maxValue = Math.max(...small.filter((t) => t.op === '+').map((t) => t.value), 0);
  for (const t of small) {
    if (t.op === '*' || t.op === '/' || (t.op === '+' && t.value === maxValue)) t.moving = true;
  }
  if (!sized.some((t) => t.moving) && small.length > 0) pick(rng, small).moving = true;
  return sized;
}

/** 弾数ぶん撃ったときの値を1つランダムに作る（目標の候補） */
function randomPathValue(rng: () => number, targets: Target[], shots: number, filter?: (t: Target) => boolean): number | null {
  const pool = shuffle(rng, filter ? targets.filter(filter) : targets);
  if (pool.length < shots) return null;
  let calc = START;
  for (const t of pool.slice(0, shots)) {
    calc = step(calc, t.op, t.value);
    if (valueOf(calc) < 0) return null;
  }
  return valueOf(calc);
}

/** ステージ 3 の + − の数。÷ の数で割り切れる数だけ使う（÷2 なら偶数、÷5 なら 5 の倍数） */
function plusValues(divide: number): number[] {
  return divide === 2 ? [4, 6, 8, 10, 12, 16, 20, 24] : [5, 10, 15, 20, 25, 30, 35, 40];
}
function minusValues(divide: number): number[] {
  return divide === 2 ? [2, 4, 6] : [5, 10];
}

/** ステージ 2（+ −）・3（× ÷）の的。D・E は同じ札を入れず、− は1枚まで（validateProblem と同じ決まり） */
function unitTargets(rng: () => number, set: ProblemSet, stage: number): Target[] {
  const plus = (v: number): [Op, number] => ['+', v];
  if (stage === 2) {
    if (set === 'standard') {
      return makeTargets(shuffle(rng, [
        ...Array.from({ length: 4 }, () => plus(pick(rng, [5, 10, 15, 20, 25, 30]))),
        ...Array.from({ length: 2 }, () => ['-', pick(rng, [5, 10, 15])] as [Op, number]),
      ]));
    }
    if (set === 'risk') {
      return withRisk(rng, makeTargets(shuffle(rng, [
        ...Array.from({ length: 3 }, () => plus(pick(rng, [5, 10]))),
        plus(15),
        plus(pick(rng, [20, 25, 30])),
        ['-', pick(rng, [5, 10])] as [Op, number],
      ])));
    }
    const count = set === 'lane' ? 5 : 7;
    return makeTargets(shuffle(rng, [
      ...pickDistinct(rng, [5, 10, 15, 20, 25, 30, 35, 40, 45], count).map(plus),
      ['-', pick(rng, [5, 10, 15])] as [Op, number],
    ]));
  }
  const divide = pick(rng, DIVIDE_VALUES);
  const times: [Op, number] = ['*', pick(rng, TIMES_VALUES)];
  const div: [Op, number] = ['/', divide];
  const values = plusValues(divide);
  if (set === 'standard') {
    const minus: Array<[Op, number]> = rng() < 0.5 ? [['-', pick(rng, minusValues(divide))]] : [];
    return makeTargets(shuffle(rng, [...Array.from({ length: 3 }, () => plus(pick(rng, values.slice(0, 6)))), times, div, ...minus]));
  }
  if (set === 'risk') {
    const small = values.filter((v) => v <= 10);
    const big = values.filter((v) => v >= 20);
    return withRisk(rng, makeTargets(shuffle(rng, [...Array.from({ length: 3 }, () => plus(pick(rng, small))), plus(pick(rng, big)), times, div])));
  }
  const count = set === 'lane' ? 4 : 6;
  return makeTargets(shuffle(rng, [...pickDistinct(rng, values, count).map(plus), times, div]));
}

export interface GenerateSpec {
  set: ProblemSet;
  stage: number;
  id: string;
  shots?: number;
}

/** 条件を満たす問題を1つ作る。作れなければ null。 */
export function generateProblem(rng: () => number, spec: GenerateSpec, tries = 5000): Problem | null {
  const shots = spec.shots ?? 3;
  for (let i = 0; i < tries; i++) {
    let targets: Target[];
    let goal: number | null;
    if (spec.stage >= 2) {
      targets = unitTargets(rng, spec.set, spec.stage);
      goal = randomPathValue(rng, targets, shots, spec.set === 'risk' ? isEasyTarget : undefined);
    } else if (spec.set === 'lane') {
      const values = pickDistinct(rng, [5, 10, 15, 20, 25, 30, 35, 40], 6);
      targets = makeTargets(values.map((v) => ['+', v] as [Op, number]));
      goal = randomPathValue(rng, targets, shots);
    } else if (spec.set === 'rise') {
      // 6つ立てて、残りの2枚は起き上がりで出てくる。8枚でも山札が毎回同じにならないよう、数は 5〜50 から選ぶ
      const values = pickDistinct(rng, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50], 8);
      targets = makeTargets(values.map((v) => ['+', v] as [Op, number]));
      goal = randomPathValue(rng, targets, shots);
    } else if (spec.set === 'standard') {
      const n = pick(rng, [5, 6]);
      targets = makeTargets(Array.from({ length: n }, () => ['+', pick(rng, [5, 10, 15, 20, 25, 30])] as [Op, number]));
      goal = randomPathValue(rng, targets, shots);
    } else {
      const specs: Array<[Op, number]> = [
        ...Array.from({ length: 3 }, () => ['+', pick(rng, [5, 10])] as [Op, number]),
        ['+', 15],
        ['+', pick(rng, [20, 25])],
        ['+', pick(rng, [25, 30])],
      ];
      targets = withRisk(rng, makeTargets(shuffle(rng, specs)));
      goal = randomPathValue(rng, targets, shots, isEasyTarget);
    }
    if (goal === null || goal <= 0) continue;
    const problem: Problem = { id: spec.id, set: spec.set, stage: spec.stage, goal, shots, targets };
    if (validateProblem(problem).length === 0) return problem;
  }
  return null;
}
