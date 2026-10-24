import type { Op } from './types';

/**
 * 計算の途中の状態。当てた順に式を書き、かけ算・わり算を先に計算する（小学4年で習う計算の順序）。
 * done = 確定した項の合計、last = 最後の項（× ÷ はこの項にだけかかる）。いまの数は done + last。
 * 例：+5 → +10 → ×2 は 5 + 10 × 2 = 25（done 5, last 20）。
 */
export interface Calc {
  done: number;
  last: number;
}

/** 0 から始める（まだ項がない） */
export const START: Calc = { done: 0, last: 0 };

export function valueOf(c: Calc): number {
  return c.done + c.last;
}

/** 1発ぶん計算を進める。+ − は新しい項を始め、× ÷ は最後の項にだけかける */
export function step(c: Calc, op: Op, value: number): Calc {
  switch (op) {
    case '+':
      return { done: c.done + c.last, last: value };
    case '-':
      return { done: c.done + c.last, last: -value };
    case '*':
      return { done: c.done, last: c.last * value };
    case '/':
      return { done: c.done, last: c.last / value };
  }
}

export function isAdditive(op: Op): boolean {
  return op === '+' || op === '-';
}

const OP_LABEL: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** 的に書く文字。例：「+10」「−5」「×2」 */
export function targetLabel(op: Op, value: number): string {
  return `${OP_LABEL[op]}${value}`;
}

/** 数の表示。マイナスは「−」を使う。 */
export function formatNumber(n: number): string {
  return n < 0 ? `−${-n}` : String(n);
}

/**
 * 撃った順に並べた式にする。0 から始まる。かけ算が先なので括弧はつけない。
 * 例：[+10,+5,×2] → "10 + 5 × 2"、[+10,×2,+5] → "10 × 2 + 5"
 */
export function formatExpression(steps: ReadonlyArray<{ op: Op; value: number }>): string {
  if (steps.length === 0) return '0';
  const [first, ...rest] = steps;
  let expr = first.op === '+' ? String(first.value) : `0 ${OP_LABEL[first.op]} ${first.value}`;
  for (const { op, value } of rest) expr = `${expr} ${OP_LABEL[op]} ${value}`;
  return expr;
}
