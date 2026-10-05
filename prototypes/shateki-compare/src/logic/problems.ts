import data from '../data/problems.json';
import type { Problem, ProblemSet, Variant } from './types';

export const ALL_PROBLEMS: Problem[] = (data as { problems: Problem[] }).problems;

export function setForVariant(variant: Variant): ProblemSet {
  return variant === 'C' ? 'risk' : 'standard';
}

export function problemsFor(set: ProblemSet, stage: number): Problem[] {
  return ALL_PROBLEMS.filter((p) => p.set === set && p.stage === stage);
}

export function stagesFor(set: ProblemSet): number[] {
  return [...new Set(ALL_PROBLEMS.filter((p) => p.set === set).map((p) => p.stage))].sort((a, b) => a - b);
}
