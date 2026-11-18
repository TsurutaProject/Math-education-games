import type { Stage } from '../types/game'
export const stageOrderVersion = '2'
const previousOrder = ['basic-pieces', 'thirds-and-sixths', 'mixed-recipes', 'cake-master', 'piece-count-challenge', 'random-piece-count-challenge', 'topping-orders', 'two-cake-orders']

export function getUnlockedStageIndex(stages: Stage[], saved: number, completed: string[], version: string | null): number {
  const validSaved = Number.isInteger(saved) && saved >= 0 ? saved : 0
  // Keep access to previously unlocked content, but the old cake-master is not
  // equivalent to the new final exam. Its completion must not skip that exam.
  const mapped = version === stageOrderVersion ? validSaved : Math.max(0, ...previousOrder.slice(0, validSaved + 1).map(id => stages.findIndex(stage => stage.id === id)))
  const completedNext = stages.reduce((next, stage, index) => completed.includes(stage.id) ? Math.max(next, index + 1) : next, 0)
  return Math.min(Math.max(mapped, completedNext), stages.length - 1)
}
