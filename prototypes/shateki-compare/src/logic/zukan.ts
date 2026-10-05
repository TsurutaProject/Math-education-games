/** 図鑑：問題ごとに見つけた解き方（正規化キー → 最初に見つけたときの式）。 */
export interface ZukanEntry {
  key: string;
  expression: string;
}

export type Zukan = Map<string, ZukanEntry[]>;

export function zukanId(variant: string, problemId: string): string {
  return `${variant}:${problemId}`;
}

/** 解き方を記録する。新しい発見なら true。 */
export function recordSolution(zukan: Zukan, id: string, entry: ZukanEntry): boolean {
  const list = zukan.get(id) ?? [];
  if (list.some((e) => e.key === entry.key)) return false;
  zukan.set(id, [...list, entry]);
  return true;
}

export function foundEntries(zukan: Zukan, id: string): ZukanEntry[] {
  return zukan.get(id) ?? [];
}
