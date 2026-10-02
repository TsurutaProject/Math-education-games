import { apply } from './ops';
import type { Problem, Step } from './types';

export type GameStatus = 'playing' | 'cleared' | 'out';

export interface GameState {
  current: number;
  shotsLeft: number;
  usedIds: string[];
  steps: Step[];
  status: GameStatus;
}

export function newGame(problem: Problem): GameState {
  return { current: 0, shotsLeft: problem.shots, usedIds: [], steps: [], status: 'playing' };
}

/** 目標との差（目標 − 今の数）。正なら「あと〇」、負なら「〇 おおい」。 */
export function remaining(problem: Problem, state: GameState): number {
  return problem.goal - state.current;
}

/**
 * 1発撃つ。targetId が null なら外れ（弾だけ減る）。
 * すでに倒した的・存在しない的・終わったゲームに対しては何もしない。
 */
export function shoot(problem: Problem, state: GameState, targetId: string | null): GameState {
  if (state.status !== 'playing' || state.shotsLeft <= 0) return state;
  if (targetId === null) {
    const shotsLeft = state.shotsLeft - 1;
    return { ...state, shotsLeft, status: endStatus(problem, state.current, shotsLeft, state.usedIds) };
  }
  const target = problem.targets.find((t) => t.id === targetId);
  if (!target || state.usedIds.includes(targetId)) return state;
  const before = state.current;
  const after = apply(before, target.op, target.value);
  const shotsLeft = state.shotsLeft - 1;
  const usedIds = [...state.usedIds, targetId];
  return {
    current: after,
    shotsLeft,
    usedIds,
    steps: [...state.steps, { targetId, op: target.op, value: target.value, before, after }],
    status: endStatus(problem, after, shotsLeft, usedIds),
  };
}

function endStatus(problem: Problem, current: number, shotsLeft: number, usedIds: string[]): GameStatus {
  if (current === problem.goal) return 'cleared';
  if (shotsLeft <= 0) return 'out';
  // 的がもう残っていなければ撃つものがないので、弾切れと同じ扱いにする
  if (usedIds.length >= problem.targets.length) return 'out';
  return 'playing';
}
