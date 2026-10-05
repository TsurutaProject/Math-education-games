import { distinctSolutions, enumerateSolutions } from './solver';
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
  };
}

/** 問題が条件を満たしているか。満たさない理由を返す（空なら OK）。 */
export function validateProblem(problem: Problem): string[] {
  const errors: string[] = [];
  const a = analyzeProblem(problem);
  if (problem.targets.length <= problem.shots) errors.push('的の数が弾数以下');
  if (new Set(problem.targets.map((t) => t.id)).size !== problem.targets.length) errors.push('的の id が重複');
  if (a.keys.length < 2) errors.push(`解き方が ${a.keys.length} 種類しかない`);
  if (a.keys.length > MAX_SOLUTIONS) errors.push(`解き方が ${a.keys.length} 種類で多すぎる`);
  if (a.hasOneShot) errors.push('1発で終わる解き方がある');
  if (!a.allNonNegative) errors.push('マイナスを通らないと実現できない解き方がある');
  const ops = new Set(problem.targets.map((t) => t.op));
  if (problem.stage === 1 && [...ops].some((op) => op !== '+')) errors.push('ステージ1に足し算以外がある');
  if (problem.stage === 2) {
    if (!ops.has('+') || !ops.has('-') || !ops.has('*')) errors.push('ステージ2に + − ×2 がそろっていない');
    if (problem.targets.some((t) => t.op === '*' && t.value !== 2)) errors.push('×2 以外の掛け算がある');
    if (!a.usesOps.has('*')) errors.push('×2 を使う解き方がない');
  }
  if (problem.set === 'risk') {
    if (problem.targets.some((t) => t.size !== sizeFor(t.op, t.value))) errors.push('的の大きさがルールと違う');
    if (problem.targets.some((t) => t.moving && t.size === 'L')) errors.push('大きい的が動いている');
    if (!problem.targets.some((t) => t.moving)) errors.push('動く的がない');
    if (!a.hasSafePath) errors.push('当てやすい的だけで届く道がない');
    if (!a.hasShortcut) errors.push('当てにくい的を使う近道がない');
  }
  return errors;
}

function makeTargets(specs: Array<[Op, number]>): Target[] {
  return specs.map(([op, value], i) => ({ id: `t${i + 1}`, op, value }));
}

function withRisk(rng: () => number, targets: Target[]): Target[] {
  const sized = targets.map((t) => ({ ...t, size: sizeFor(t.op, t.value), moving: false }));
  const small = sized.filter((t) => t.size === 'S');
  // 小さい的のうち、×2 と いちばん大きい数は動かす
  const maxValue = Math.max(...small.filter((t) => t.op === '+').map((t) => t.value), 0);
  for (const t of small) {
    if (t.op === '*' || t.value === maxValue) t.moving = true;
  }
  if (!sized.some((t) => t.moving) && small.length > 0) pick(rng, small).moving = true;
  return sized;
}

/** 弾数ぶん撃ったときの値を1つランダムに作る（目標の候補） */
function randomPathValue(rng: () => number, targets: Target[], shots: number, filter?: (t: Target) => boolean): number | null {
  const pool = shuffle(rng, filter ? targets.filter(filter) : targets);
  if (pool.length < shots) return null;
  let v = 0;
  for (const t of pool.slice(0, shots)) {
    if (t.op === '+') v += t.value;
    else if (t.op === '-') v -= t.value;
    else if (t.op === '*') v *= t.value;
    if (v < 0) return null;
  }
  return v;
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
    if (spec.set === 'standard' && spec.stage === 1) {
      const n = pick(rng, [5, 6]);
      targets = makeTargets(Array.from({ length: n }, () => ['+', pick(rng, [5, 10, 15, 20, 25, 30])] as [Op, number]));
      goal = randomPathValue(rng, targets, shots);
    } else if (spec.set === 'standard') {
      const specs: Array<[Op, number]> = [
        ...Array.from({ length: 4 }, () => ['+', pick(rng, [5, 10, 15, 20, 25, 30])] as [Op, number]),
        ['-', pick(rng, [5, 10])],
        ['*', 2],
      ];
      targets = makeTargets(shuffle(rng, specs));
      goal = randomPathValue(rng, targets, shots);
    } else if (spec.stage === 1) {
      const specs: Array<[Op, number]> = [
        ...Array.from({ length: 3 }, () => ['+', pick(rng, [5, 10])] as [Op, number]),
        ['+', 15],
        ['+', pick(rng, [20, 25])],
        ['+', pick(rng, [25, 30])],
      ];
      targets = withRisk(rng, makeTargets(shuffle(rng, specs)));
      goal = randomPathValue(rng, targets, shots, isEasyTarget);
    } else {
      const specs: Array<[Op, number]> = [
        ...Array.from({ length: 3 }, () => ['+', pick(rng, [5, 10])] as [Op, number]),
        ['-', 5],
        ['+', pick(rng, [15, 20, 25])],
        ['*', 2],
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
