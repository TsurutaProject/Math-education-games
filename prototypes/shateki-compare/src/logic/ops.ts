import type { Op } from './types';

export function apply(current: number, op: Op, value: number): number {
  switch (op) {
    case '+':
      return current + value;
    case '-':
      return current - value;
    case '*':
      return current * value;
    case '/':
      return current / value;
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
 * 撃った順の演算を左から計算した式にする。0 から始まる。
 * 例：[+10,+5,×2] → "(10 + 5) × 2"、[+10,×2,+5] → "10 × 2 + 5"
 */
export function formatExpression(steps: ReadonlyArray<{ op: Op; value: number }>): string {
  if (steps.length === 0) return '0';
  let expr: string;
  // いちばん外側が足し算・引き算の形か（このあと × ÷ が来たら括弧が必要）
  let topAdditive: boolean;
  const [first, ...rest] = steps;
  if (first.op === '+') {
    expr = String(first.value);
    topAdditive = false;
  } else {
    expr = `0 ${OP_LABEL[first.op]} ${first.value}`;
    topAdditive = isAdditive(first.op);
  }
  for (const { op, value } of rest) {
    if (!isAdditive(op) && topAdditive) expr = `(${expr})`;
    expr = `${expr} ${OP_LABEL[op]} ${value}`;
    topAdditive = isAdditive(op);
  }
  return expr;
}
