import { solutionKey } from './normalize';
import { START, step, valueOf, type Calc } from './ops';
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
 * start は計算の途中の状態（× ÷ は最後の項にかかるので、数だけでなく項まで要る）。
 * key は start から撃った手だけで作る（図鑑で使うのは start = START のときだけ）。
 */
export function enumerateSolutions(
  problem: Problem,
  start: Calc = START,
  usedIds: ReadonlyArray<string> = [],
  shotsLeft = problem.shots,
): Solution[] {
  const results: Solution[] = [];
  const available = problem.targets.filter((t) => !usedIds.includes(t.id));
  const used = new Set<string>();
  const path: Target[] = [];

  const dfs = (calc: Calc, shots: number, nonNegative: boolean) => {
    if (shots === 0) return;
    for (const t of available) {
      if (used.has(t.id)) continue;
      const next = step(calc, t.op, t.value);
      const nn = nonNegative && valueOf(next) >= 0;
      path.push(t);
      if (valueOf(next) === problem.goal) {
        results.push({ targets: [...path], key: solutionKey(path), nonNegative: nn });
      } else {
        used.add(t.id);
        dfs(next, shots - 1, nn);
        used.delete(t.id);
      }
      path.pop();
    }
  };

  if (valueOf(start) !== problem.goal) dfs(start, shotsLeft, valueOf(start) >= 0);
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
  start: Calc,
  usedIds: ReadonlyArray<string>,
  shotsLeft: number,
): boolean {
  if (valueOf(start) === problem.goal) return true;
  const available = problem.targets.filter((t) => !usedIds.includes(t.id));
  const used = new Set<string>();
  const dfs = (calc: Calc, shots: number): boolean => {
    if (shots === 0) return false;
    for (const t of available) {
      if (used.has(t.id)) continue;
      const next = step(calc, t.op, t.value);
      if (valueOf(next) === problem.goal) return true;
      used.add(t.id);
      const ok = dfs(next, shots - 1);
      used.delete(t.id);
      if (ok) return true;
    }
    return false;
  };
  return dfs(start, shotsLeft);
}
