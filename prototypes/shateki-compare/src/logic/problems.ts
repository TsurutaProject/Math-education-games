import data from '../data/problems.json';
import type { Problem } from './types';

export { setForVariant } from './course';

export const ALL_PROBLEMS: Problem[] = (data as { problems: Problem[] }).problems;

export function problemById(id: string): Problem | undefined {
  return ALL_PROBLEMS.find((p) => p.id === id);
}
