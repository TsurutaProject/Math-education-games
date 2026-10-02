/** 的に書かれた演算。データでは + − ×2 だけ使うが、正規化は ÷ にも対応する。 */
export type Op = '+' | '-' | '*' | '/';

/** C で使う的の大きさ。L=大きい（当てやすい）, S=小さい。 */
export type TargetSize = 'L' | 'M' | 'S';

export interface Target {
  id: string;
  op: Op;
  value: number;
  /** C 用。A/B では無視して全部同じ大きさにする。 */
  size?: TargetSize;
  /** C 用。左右に動くかどうか。 */
  moving?: boolean;
}

/** standard = A/B 用、risk = C 用（安全な道と近道がある問題）。 */
export type ProblemSet = 'standard' | 'risk';

export interface Problem {
  id: string;
  set: ProblemSet;
  stage: number;
  goal: number;
  shots: number;
  targets: Target[];
}

/** 撃った順の1手。どの的に当たったか、その前後の数。 */
export interface Step {
  targetId: string;
  op: Op;
  value: number;
  before: number;
  after: number;
}

export type Variant = 'A' | 'B' | 'C';
