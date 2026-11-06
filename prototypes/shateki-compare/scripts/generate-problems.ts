/**
 * 問題データ src/data/problems.json を作るスクリプト。
 *   npm run gen:problems            足りない問題だけ作る（今ある問題はそのまま残す）
 *   npm run gen:problems -- --all   全部作り直す
 * コースの表（src/logic/course.ts）に出てくる問題だけを作る。std-1-1・risk-1-1 は手で決めた問題、残りはソルバーで条件を満たすものを探す。
 * シードを変えると別の問題セットになる（例：npm run gen:problems -- --all 42）。
 *
 * 今ある問題を残すのは、遊び比べに使っている問題を変えないため。
 * 問題の作り方や条件を変えると乱数の進み方が変わり、全部作り直すと関係ない問題まで変わってしまう。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRng, generateProblem, sizeFor, validateProblem } from '../src/logic/generator';
import { allNodes, setForVariant } from '../src/logic/course';
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
// コースの表（src/logic/course.ts）に出てくる問題を、ステージの順に作る。同じ種類・ステージの中で目標はそろえない
const goalsOf = new Map<string, Set<number>>();
for (const { stage, node } of allNodes()) {
  const set: ProblemSet = setForVariant(node.variant);
  const id = node.problemId;
  const goals = goalsOf.get(`${set}-${stage}`) ?? new Set<number>();
  goalsOf.set(`${set}-${stage}`, goals);
  const kept = handmade.find((h) => h.id === id) ?? existing.find((e) => e.id === id) ?? null;
  let p = kept;
  while (!p || (goals.has(p.goal) && p !== kept)) {
    p = generateProblem(rng, { set, stage, id });
    if (!p) throw new Error(`${id} を作れませんでした`);
  }
  const errors = validateProblem(p);
  if (errors.length) throw new Error(`${id}: ${errors.join(', ')}（今ある問題が条件を満たさないときは --all で作り直す）`);
  if (p.stage !== stage || p.set !== set) throw new Error(`${id}: コースではステージ${stage}・${set} なのに、問題はステージ${p.stage}・${p.set}`);
  goals.add(p.goal);
  problems.push(p);
}

writeFileSync(out, JSON.stringify({ seed, problems }, null, 2) + '\n');
console.log(`wrote ${problems.length} problems to ${out}`);
