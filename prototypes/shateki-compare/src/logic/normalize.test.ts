import { describe, expect, it } from 'vitest';
import { solutionKey } from './normalize';
import { formatExpression } from './ops';
import type { Op } from './types';

const m = (...pairs: Array<[Op, number]>) => pairs.map(([op, value]) => ({ op, value }));

describe('solutionKey（解き方の同一判定）', () => {
  it('足し算の並べ替えは同じ解き方', () => {
    expect(solutionKey(m(['+', 10], ['+', 10], ['+', 20]))).toBe(solutionKey(m(['+', 20], ['+', 10], ['+', 10])));
  });

  it('×2 は直前の項にだけかかるので、5+10×2 と 10×2+5 は同じ解き方', () => {
    expect(solutionKey(m(['+', 5], ['+', 10], ['*', 2]))).toBe(solutionKey(m(['+', 10], ['*', 2], ['+', 5])));
  });

  it('×2 がどの項にかかるかで別の解き方（10+5×2 と 5+10×2）', () => {
    expect(solutionKey(m(['+', 10], ['+', 5], ['*', 2]))).not.toBe(solutionKey(m(['+', 5], ['+', 10], ['*', 2])));
  });

  it('×2 がかかった項と、同じ値の的は別の解き方（10×2 と 20）', () => {
    expect(solutionKey(m(['+', 10], ['*', 2], ['+', 5]))).not.toBe(solutionKey(m(['+', 20], ['+', 5])));
  });

  it('引き算の項にも ×2 がかかる（20−5×2 と 20×2−5 は別）', () => {
    expect(solutionKey(m(['+', 20], ['-', 5], ['*', 2]))).toBe('+20,-5*2');
    expect(solutionKey(m(['+', 20], ['*', 2], ['-', 5]))).toBe('+20*2,-5');
  });

  it('1つの項にかかる × ÷ も並べ替える', () => {
    expect(solutionKey(m(['+', 8], ['*', 2], ['/', 4]))).toBe(solutionKey(m(['+', 8], ['/', 4], ['*', 2])));
  });

  it('引き算は順番が変わっても同じ', () => {
    expect(solutionKey(m(['+', 20], ['-', 5]))).toBe(solutionKey(m(['-', 5], ['+', 20])));
  });

  it('最初の項より前の ×2 は 0 にかかって何も変えないので、その手は除く', () => {
    expect(solutionKey(m(['*', 2], ['+', 10], ['+', 20]))).toBe(solutionKey(m(['+', 10], ['+', 20])));
  });

  it('値で扱うので、同じ数字の的のどちらに当てたかは区別しない（キーに id が入らない）', () => {
    expect(solutionKey(m(['+', 10], ['+', 10], ['+', 20]))).toBe('+10,+10,+20');
    expect(solutionKey(m(['+', 10], ['*', 2], ['+', 5]))).toBe('+5,+10*2');
  });
});

describe('formatExpression（式の表示）', () => {
  it('足し算だけ', () => {
    expect(formatExpression(m(['+', 10], ['+', 10], ['+', 20]))).toBe('10 + 10 + 20');
  });
  it('かけ算が先なので括弧はつけない', () => {
    expect(formatExpression(m(['+', 10], ['+', 5], ['*', 2]))).toBe('10 + 5 × 2');
  });
  it('1つめで ×2', () => {
    expect(formatExpression(m(['+', 10], ['*', 2], ['+', 5]))).toBe('10 × 2 + 5');
  });
  it('×2 が続く', () => {
    expect(formatExpression(m(['+', 10], ['+', 5], ['*', 2], ['*', 2]))).toBe('10 + 5 × 2 × 2');
  });
  it('引き算や ×2 から始めると 0 から書く', () => {
    expect(formatExpression(m(['-', 5], ['+', 20]))).toBe('0 − 5 + 20');
    expect(formatExpression(m(['*', 2], ['+', 10]))).toBe('0 × 2 + 10');
  });
});
