import { describe, expect, it } from 'vitest';
import { solutionKey } from './normalize';
import { formatExpression } from './ops';
import type { Op } from './types';

const m = (...pairs: Array<[Op, number]>) => pairs.map(([op, value]) => ({ op, value }));

describe('solutionKey（解き方の同一判定）', () => {
  it('足し算の並べ替えは同じ解き方', () => {
    expect(solutionKey(m(['+', 10], ['+', 10], ['+', 20]))).toBe(solutionKey(m(['+', 20], ['+', 10], ['+', 10])));
  });

  it('(10+5)×2 と 10×2+5 は別の解き方', () => {
    expect(solutionKey(m(['+', 10], ['+', 5], ['*', 2]))).not.toBe(solutionKey(m(['+', 10], ['*', 2], ['+', 5])));
  });

  it('(10+5)×2 と (5+10)×2 は同じ', () => {
    expect(solutionKey(m(['+', 10], ['+', 5], ['*', 2]))).toBe(solutionKey(m(['+', 5], ['+', 10], ['*', 2])));
  });

  it('掛け算のあとの足し算・引き算のまとまりも中で並べ替える', () => {
    expect(solutionKey(m(['+', 10], ['*', 2], ['+', 5], ['-', 10]))).toBe(
      solutionKey(m(['+', 10], ['*', 2], ['-', 10], ['+', 5])),
    );
  });

  it('掛け算・割り算が続く部分も並べ替える', () => {
    expect(solutionKey(m(['+', 8], ['*', 2], ['/', 4]))).toBe(solutionKey(m(['+', 8], ['/', 4], ['*', 2])));
  });

  it('引き算はまとまりの中で順番が変わっても同じ', () => {
    expect(solutionKey(m(['+', 20], ['-', 5]))).toBe(solutionKey(m(['-', 5], ['+', 20])));
  });

  it('0 に ×2 しても何も変わらないので、その手は除く', () => {
    expect(solutionKey(m(['*', 2], ['+', 10], ['+', 20]))).toBe(solutionKey(m(['+', 10], ['+', 20])));
  });

  it('値で扱うので、同じ数字の的のどちらに当てたかは区別しない（キーに id が入らない）', () => {
    expect(solutionKey(m(['+', 10], ['+', 10], ['+', 20]))).toBe('+10,+10,+20');
  });
});

describe('formatExpression（式の表示）', () => {
  it('足し算だけ', () => {
    expect(formatExpression(m(['+', 10], ['+', 10], ['+', 20]))).toBe('10 + 10 + 20');
  });
  it('足してから ×2 は括弧をつける', () => {
    expect(formatExpression(m(['+', 10], ['+', 5], ['*', 2]))).toBe('(10 + 5) × 2');
  });
  it('1つめで ×2 なら括弧はいらない', () => {
    expect(formatExpression(m(['+', 10], ['*', 2], ['+', 5]))).toBe('10 × 2 + 5');
  });
  it('×2 が続くときに余計な括弧をつけない', () => {
    expect(formatExpression(m(['+', 10], ['+', 5], ['*', 2], ['*', 2]))).toBe('(10 + 5) × 2 × 2');
  });
  it('引き算から始めると 0 から書く', () => {
    expect(formatExpression(m(['-', 5], ['+', 20]))).toBe('0 − 5 + 20');
  });
});
