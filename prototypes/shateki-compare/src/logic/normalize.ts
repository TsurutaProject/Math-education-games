import { apply, isAdditive } from './ops';
import type { Op } from './types';

interface Move {
  op: Op;
  value: number;
}

const OP_ORDER: Record<Op, number> = { '+': 0, '-': 1, '*': 2, '/': 3 };

function termKey(m: Move): string {
  return `${m.op}${m.value}`;
}

function compareMoves(a: Move, b: Move): number {
  return OP_ORDER[a.op] - OP_ORDER[b.op] || a.value - b.value;
}

/**
 * 解き方の正規化キー（図鑑で「同じ解き方」かを判定する）。
 *
 * - 足し算・引き算が続く部分、掛け算・割り算が続く部分を、それぞれまとまりの中で並べ替える
 * - 的の id ではなく数字で扱うので、同じ数字の的はどちらに当てても同じ
 * - 今の数が 0 のときの × ÷ は何も変えないので取り除く（0 × 2 + 30 は 30 と同じ解き方）
 *
 * 例：10+10+20 と 20+10+10 は同じ "+10,+10,+20"。(10+5)×2 は "+5,+10|*2"、10×2+5 は "+10|*2|+5"。
 */
export function solutionKey(moves: ReadonlyArray<Move>, start = 0): string {
  const groups: Move[][] = [];
  let current = start;
  for (const m of moves) {
    const additive = isAdditive(m.op);
    const next = apply(current, m.op, m.value);
    if (!additive && current === 0) {
      current = next;
      continue;
    }
    current = next;
    const last = groups[groups.length - 1];
    if (last && isAdditive(last[0].op) === additive) {
      last.push(m);
    } else {
      groups.push([m]);
    }
  }
  return groups.map((g) => [...g].sort(compareMoves).map(termKey).join(',')).join('|');
}
