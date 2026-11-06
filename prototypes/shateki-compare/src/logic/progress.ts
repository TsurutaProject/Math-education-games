import { allNodes, mapNo, type CourseNode, type NodeRef } from './course';
import { problemById } from './problems';
import { distinctSolutions } from './solver';
import type { Zukan } from './zukan';

/**
 * マップに出す、問題ごとの進み具合（#44）。
 * - none：まだ遊んでいない
 * - tried：遊んだが、まだクリアしていない（挑戦済み）
 * - cleared：解き方を1つ以上見つけた（緑の「クリア」）
 * - complete：全部の解き方を見つけた（完全クリア。山吹色の「クリア」と星）
 */
export type NodeStatus = 'none' | 'tried' | 'cleared' | 'complete';

/**
 * その問題で見つけた解き方の数。図鑑は射撃タイプごとに分かれている（gun・tap は遊び方だけ、ほかは「遊び方-射撃タイプ」）ので、
 * いちばん多く見つけている射撃タイプの数にする。
 */
export function foundCount(zukan: Zukan, node: CourseNode): number {
  let best = 0;
  for (const [id, entries] of zukan) {
    const [kind, problemId] = id.split(':');
    if (problemId !== node.problemId) continue;
    if (kind !== node.variant && !kind.startsWith(`${node.variant}-`)) continue;
    best = Math.max(best, entries.length);
  }
  return best;
}

const totals = new Map<string, number>();
/** その問題の解き方の数（図鑑の「◯つ中」と同じ） */
export function totalCount(problemId: string): number {
  let n = totals.get(problemId);
  if (n === undefined) {
    const p = problemById(problemId);
    n = p ? distinctSolutions(p).size : 0;
    totals.set(problemId, n);
  }
  return n;
}

export function nodeStatus(zukan: Zukan, node: CourseNode, played: boolean): NodeStatus {
  const found = foundCount(zukan, node);
  if (found > 0) return found >= totalCount(node.problemId) ? 'complete' : 'cleared';
  return played ? 'tried' : 'none';
}

/**
 * マップで問題を選んだときのログの中身（#56）。説明の問題を飛ばしたか・どんな順で選んだかを見るため。
 * 「クリア」は解き方を1つ以上見つけた問題（マップの緑・山吹色の「クリア」と同じ）。
 */
export function selectionInfo(zukan: Zukan, selected: NodeRef): { clearedMapNos: string[]; firstUnclearedMapNo: string | null; skippedMapNos: string[] } {
  const list = allNodes();
  const cleared = (n: (typeof list)[number]) => foundCount(zukan, n.node) > 0;
  const at = list.findIndex((n) => n.stage === selected.stage && n.index === selected.index);
  const firstUncleared = list.find((n) => !cleared(n));
  return {
    clearedMapNos: list.filter(cleared).map(mapNo),
    firstUnclearedMapNo: firstUncleared ? mapNo(firstUncleared) : null,
    skippedMapNos: list.slice(0, Math.max(0, at)).filter((n) => !cleared(n)).map(mapNo),
  };
}
