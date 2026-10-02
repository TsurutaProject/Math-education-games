import { apply } from './ops';
import { solutionKey } from './normalize';
import type { Problem, Target } from './types';

export interface Solution {
  /** 撃った順の的 */
  targets: Target[];
  key: string;
  /** 途中で 0 より小さくならないか（小学生向けの道かどうか） */
  nonNegative: boolean;
}

/**
 * 残りの弾で撃てる順番を全部ためし、目標に届く撃ち方を列挙する。
 * ゲームと同じく、目標に一致した時点で打ち切る（それ以上は撃たない）。
 */
export function enumerateSolutions(
  problem: Problem,
  current = 0,
  usedIds: ReadonlyArray<string> = [],
  shotsLeft = problem.shots,
): Solution[] {
  const results: Solution[] = [];
  const available = problem.targets.filter((t) => !usedIds.includes(t.id));
  const used = new Set<string>();
  const path: Target[] = [];

  const dfs = (value: number, shots: number, nonNegative: boolean) => {
    if (shots === 0) return;
    for (const t of available) {
      if (used.has(t.id)) continue;
      const next = apply(value, t.op, t.value);
      const nn = nonNegative && next >= 0;
      path.push(t);
      if (next === problem.goal) {
        results.push({ targets: [...path], key: solutionKey(path, current), nonNegative: nn });
      } else {
        used.add(t.id);
        dfs(next, shots - 1, nn);
        used.delete(t.id);
      }
      path.pop();
    }
  };

  if (current !== problem.goal) dfs(current, shotsLeft, current >= 0);
  return results;
}

/** 正規化キーごとにまとめた解き方。代表は「マイナスを通らない」撃ち方、次に弾の少ない撃ち方を優先。 */
export function distinctSolutions(problem: Problem, all = enumerateSolutions(problem)): Map<string, Solution> {
  const map = new Map<string, Solution>();
  for (const s of all) {
    const prev = map.get(s.key);
    if (!prev || better(s, prev)) map.set(s.key, s);
  }
  return map;
}

function better(a: Solution, b: Solution): boolean {
  if (a.nonNegative !== b.nonNegative) return a.nonNegative;
  return a.targets.length < b.targets.length;
}

/** 途中の状態から、残りの弾で目標に届くか（ログ用。画面には出さない）。 */
export function canReach(
  problem: Problem,
  current: number,
  usedIds: ReadonlyArray<string>,
  shotsLeft: number,
): boolean {
  if (current === problem.goal) return true;
  const available = problem.targets.filter((t) => !usedIds.includes(t.id));
  const used = new Set<string>();
  const dfs = (value: number, shots: number): boolean => {
    if (shots === 0) return false;
    for (const t of available) {
      if (used.has(t.id)) continue;
      const next = apply(value, t.op, t.value);
      if (next === problem.goal) return true;
      used.add(t.id);
      const ok = dfs(next, shots - 1);
      used.delete(t.id);
      if (ok) return true;
    }
    return false;
  };
  return dfs(current, shotsLeft);
}
