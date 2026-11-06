import { solutionKey } from './normalize';
import type { Calc } from './ops';
import { distinctSolutions, enumerateSolutions, type Solution } from './solver';
import type { Problem, Step } from './types';

/**
 * ヒント（#57）。図鑑にまだない解き方を1つ選び、それに向かうための「つぎに当てる的」を決める。
 * - target：その的を光らせる（key は選んだ解き方。最初から数えた撃ち方の正規化キー）
 * - restart：いまの式の続きでは、まだ見つけていない解き方に行けない。「さいしょから」を強調する
 * - none：全部の解き方を見つけている（ヒントのボタンは押せない）
 */
export type Hint = { kind: 'target'; key: string; targetId: string } | { kind: 'restart' } | { kind: 'none' };

export interface HintState {
  calc: Calc;
  usedIds: ReadonlyArray<string>;
  shotsLeft: number;
  /** ここまでに当てた的（撃った順） */
  steps: ReadonlyArray<Pick<Step, 'op' | 'value'>>;
}

export interface HintOptions {
  /**
   * 前に選んだ解き方。まだ行けて、まだ見つけていなければ、同じ解き方を続ける
   * （ヒントを押すたびにちがう道を光らせて、子どもを迷わせないように）
   */
  previousKey?: string;
  /**
   * 途中でマイナスにならない道だけを選ぶ。D・E は、いまの数をマイナスにする札を出さないので、
   * マイナスを通る道を選ぶと、光らせたい的がいつまでも出てこない
   */
  nonNegativeOnly?: boolean;
}

/** 全部の解き方を見つけたか（ヒントのボタンを押せなくする） */
export function allFound(problem: Problem, foundKeys: ReadonlySet<string>): boolean {
  for (const key of distinctSolutions(problem).keys()) if (!foundKeys.has(key)) return false;
  return true;
}

export function chooseHint(problem: Problem, state: HintState, foundKeys: ReadonlySet<string>, options: HintOptions = {}): Hint {
  if (allFound(problem, foundKeys)) return { kind: 'none' };
  // いまの式の続きで目標に届く撃ち方。最初からの撃ち方にしてキーを作り、図鑑にないものだけ残す
  const candidates = new Map<string, Solution>();
  for (const rest of enumerateSolutions(problem, state.calc, state.usedIds, state.shotsLeft)) {
    if (options.nonNegativeOnly && !rest.nonNegative) continue;
    const key = solutionKey([...state.steps, ...rest.targets]);
    if (foundKeys.has(key)) continue;
    const prev = candidates.get(key);
    if (!prev || better(rest, prev)) candidates.set(key, rest);
  }
  if (candidates.size === 0) return { kind: 'restart' };
  const kept = options.previousKey ? candidates.get(options.previousKey) : undefined;
  if (kept) return { kind: 'target', key: options.previousKey!, targetId: kept.targets[0].id };
  let bestKey = '';
  let best: Solution | undefined;
  for (const [key, s] of candidates) {
    if (!best || better(s, best)) {
      best = s;
      bestKey = key;
    }
  }
  return { kind: 'target', key: bestKey, targetId: best!.targets[0].id };
}

/** マイナスを通らない道、次に弾の少ない道を優先（図鑑の代表の選び方と同じ） */
function better(a: Solution, b: Solution): boolean {
  if (a.nonNegative !== b.nonNegative) return a.nonNegative;
  return a.targets.length < b.targets.length;
}
