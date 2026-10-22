import { isAdditive } from './ops';
import type { Op } from './types';

interface Move {
  op: Op;
  value: number;
}

const OP_ORDER: Record<Op, number> = { '+': 0, '-': 1, '*': 2, '/': 3 };

function compareMoves(a: Move, b: Move): number {
  return OP_ORDER[a.op] - OP_ORDER[b.op] || a.value - b.value;
}

/** 項 = 符号つきの数（+ −）と、その項にかかった × ÷ */
type Term = { head: Move; factors: Move[] };

function compareTerms(a: Term, b: Term): number {
  return compareMoves(a.head, b.head) || termKey(a).localeCompare(termKey(b));
}

function termKey(t: Term): string {
  return [t.head, ...[...t.factors].sort(compareMoves)].map((m) => `${m.op}${m.value}`).join('');
}

/**
 * 解き方の正規化キー（図鑑で「同じ解き方」かを判定する）。
 *
 * かけ算・わり算が先なので、式は「項の足し算」になる。項を並べ替えて比べる。
 * - 項の中の × ÷ も並べ替える（10 × 2 ÷ 4 と 10 ÷ 4 × 2 は同じ）
 * - 的の id ではなく数字で扱うので、同じ数字の的はどちらに当てても同じ
 * - 最初の項より前の × ÷ は 0 にかかって何も変えないので取り除く（0 × 2 + 30 は 30 と同じ解き方）
 *
 * 例：10+10+20 と 20+10+10 は同じ "+10,+10,+20"。5+10×2 と 10×2+5 は同じ "+5,+10*2"。
 * 10+5×2 は "+10,+5*2" で別の解き方。
 */
export function solutionKey(moves: ReadonlyArray<Move>): string {
  const terms: Term[] = [];
  for (const m of moves) {
    if (isAdditive(m.op)) terms.push({ head: m, factors: [] });
    else if (terms.length > 0) terms[terms.length - 1].factors.push(m);
  }
  return [...terms].sort(compareTerms).map(termKey).join(',');
}
