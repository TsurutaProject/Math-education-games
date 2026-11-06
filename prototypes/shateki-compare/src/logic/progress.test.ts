import { describe, expect, it } from 'vitest';
import { COURSE } from './course';
import { foundCount, nodeStatus, selectionInfo, totalCount } from './progress';
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

describe('マップで選んだときのログの中身（#56）', () => {
  it('はじめて開いて 2-1 を選ぶと、ステージ 1 の 6 問を飛ばしたことになる', () => {
    const info = selectionInfo(new Map(), { stage: 2, index: 0 });
    expect(info.clearedMapNos).toEqual([]);
    expect(info.firstUnclearedMapNo).toBe('1-1');
    expect(info.skippedMapNos).toEqual(['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']);
  });

  it('クリアした問題は飛ばしたことにしない。順に選べば飛ばしたものはない', () => {
    const [a, b] = COURSE[0].nodes;
    const zukan: Zukan = new Map([
      [`${a.variant}:${a.problemId}`, [entry('x')]],
      [`${b.variant}:${b.problemId}`, [entry('x')]],
    ]);
    const info = selectionInfo(zukan, { stage: 1, index: 2 });
    expect(info.clearedMapNos).toEqual(['1-1', '1-2']);
    expect(info.firstUnclearedMapNo).toBe('1-3');
    expect(info.skippedMapNos).toEqual([]);
  });
});
