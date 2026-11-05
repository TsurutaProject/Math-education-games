/**
 * 問題データ src/data/problems.json を作るスクリプト。
 *   npm run gen:problems            足りない問題だけ作る（今ある問題はそのまま残す）
 *   npm run gen:problems -- --all   全部作り直す
 * 各ステージの1問目は手で決めた問題、残りはソルバーで条件を満たすものを探す。
 * シードを変えると別の問題セットになる（例：npm run gen:problems -- --all 42）。
 *
 * 今ある問題を残すのは、遊び比べに使っている問題を変えないため。
 * 問題の作り方や条件を変えると乱数の進み方が変わり、全部作り直すと関係ない問題まで変わってしまう。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRng, generateProblem, sizeFor, validateProblem } from '../src/logic/generator';
import type { Problem, ProblemSet } from '../src/logic/types';

const args = process.argv.slice(2);
const all = args.includes('--all');
const seed = Number(args.find((a) => a !== '--all') ?? 20261102);
const rng = createRng(seed);
const out = fileURLToPath(new URL('../src/data/problems.json', import.meta.url));
const existing: Problem[] = all ? [] : (JSON.parse(readFileSync(out, 'utf8')) as { problems: Problem[] }).problems;

const handmade: Problem[] = [
  {
    // 依頼にあった例そのまま
    id: 'std-1-1',
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
  },
  {
    // C 用。例に +10 を1つ足し、目標を 30 にして「大きい的だけで届く道」を作った
    id: 'risk-1-1',
    set: 'risk',
    stage: 1,
    goal: 30,
    shots: 3,
    targets: (
      [
        ['t1', 10],
        ['t2', 5],
        ['t3', 20],
        ['t4', 10],
        ['t5', 15],
        ['t6', 10],
      ] as const
    ).map(([id, value]) => ({ id, op: '+' as const, value, size: sizeFor('+', value), moving: value === 20 })),
  },
];

const problems: Problem[] = [];
const plan: Array<{ set: ProblemSet; stage: number }> = [
  { set: 'standard', stage: 1 },
  { set: 'standard', stage: 2 },
  { set: 'risk', stage: 1 },
  { set: 'risk', stage: 2 },
  // D 用。乱数の順番が変わらないように、いちばん後ろに足す
  { set: 'lane', stage: 1 },
  { set: 'lane', stage: 2 },
  // E 用。同じく、いちばん後ろに足す
  { set: 'rise', stage: 1 },
  { set: 'rise', stage: 2 },
];
for (const { set, stage } of plan) {
  const prefix = set === 'standard' ? 'std' : set;
  const goals = new Set<number>();
  for (let n = 1; n <= 3; n++) {
    const id = `${prefix}-${stage}-${n}`;
    const kept = handmade.find((h) => h.id === id) ?? existing.find((e) => e.id === id) ?? null;
    let p = kept;
    while (!p || (goals.has(p.goal) && p !== kept)) {
      p = generateProblem(rng, { set, stage, id });
      if (!p) throw new Error(`${id} を作れませんでした`);
    }
    const errors = validateProblem(p);
    if (errors.length) throw new Error(`${id}: ${errors.join(', ')}（今ある問題が条件を満たさないときは --all で作り直す）`);
    goals.add(p.goal);
    problems.push(p);
  }
}

writeFileSync(out, JSON.stringify({ seed, problems }, null, 2) + '\n');
console.log(`wrote ${problems.length} problems to ${out}`);
