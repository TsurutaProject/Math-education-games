import { describe, expect, it } from 'vitest';
import { COURSE } from './course';
import { foundCount, nodeStatus, totalCount } from './progress';
import type { Zukan } from './zukan';

const node = COURSE[0].nodes[2]; // C の問題（risk-1-1）
const entry = (key: string) => ({ key, expression: key });

describe('マップの進み具合（#44）', () => {
  it('遊んでいない・挑戦済み・クリア・完全クリア', () => {
    const zukan: Zukan = new Map();
    expect(nodeStatus(zukan, node, false)).toBe('none');
    expect(nodeStatus(zukan, node, true)).toBe('tried');
    zukan.set(`C:${node.problemId}`, [entry('a')]);
    expect(nodeStatus(zukan, node, true)).toBe('cleared');
    const total = totalCount(node.problemId);
    expect(total).toBeGreaterThanOrEqual(2);
    zukan.set(`C:${node.problemId}`, Array.from({ length: total }, (_, i) => entry(`k${i}`)));
    expect(nodeStatus(zukan, node, true)).toBe('complete');
  });

  it('射撃タイプごとの図鑑のうち、いちばん多く見つけたものを数える。ほかの遊び方・問題は数えない', () => {
    const zukan: Zukan = new Map([
      [`C:${node.problemId}`, [entry('a')]],
      [`C-sling:${node.problemId}`, [entry('a'), entry('b')]],
      [`D:${node.problemId}`, [entry('a'), entry('b'), entry('c')]],
      ['C:other', [entry('a'), entry('b'), entry('c')]],
    ]);
    expect(foundCount(zukan, node)).toBe(2);
  });
});
