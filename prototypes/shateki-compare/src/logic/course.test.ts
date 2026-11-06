import { describe, expect, it } from 'vitest';
import { allNodes, COURSE, firstRefOfVariant, mapNo, nextRef, parseMapNo } from './course';

describe('コースの表（#52）', () => {
  it('ステージは 1〜3。どのステージも 5〜6 問', () => {
    expect(COURSE.map((s) => s.stage)).toEqual([1, 2, 3]);
    for (const s of COURSE) {
      expect(s.nodes.length).toBeGreaterThanOrEqual(5);
      expect(s.nodes.length).toBeLessThanOrEqual(6);
    }
  });

  it('はじめの問題はステージ 1・2 が A、ステージ 3 から B。そのあとは C・D・C・E', () => {
    const rows = COURSE.map((s) => s.nodes.map((n) => `${n.variant}${n.role === 'intro' ? '*' : ''}`).join(''));
    expect(rows).toEqual(['A*A*CDCE', 'A*CDCE', 'B*CDCE']);
  });

  it('A はゲーム全体で 3 問', () => {
    expect(allNodes().filter((n) => n.node.variant === 'A')).toHaveLength(3);
  });

  it('同じ問題を2回使わない', () => {
    const ids = allNodes().map((n) => n.node.problemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('マップの番号と位置を行き来できる。コースにない番号は null', () => {
    expect(mapNo({ stage: 2, index: 2 })).toBe('2-3');
    expect(parseMapNo('2-3')).toEqual({ stage: 2, index: 2 });
    expect(parseMapNo('3-6')).toBeNull();
    expect(parseMapNo('abc')).toBeNull();
    expect(parseMapNo(null)).toBeNull();
  });

  it('つぎの問題はステージをまたいで進み、最後のつぎは null', () => {
    expect(nextRef({ stage: 1, index: 5 })).toEqual({ stage: 2, index: 0 });
    expect(nextRef({ stage: 3, index: 4 })).toBeNull();
  });

  it('前の形の ?variant= は、その遊び方がコースで最初に出てくる問題にする', () => {
    expect(firstRefOfVariant('B')).toEqual({ stage: 3, index: 0 });
    expect(firstRefOfVariant('D')).toEqual({ stage: 1, index: 3 });
  });
});
