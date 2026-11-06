import type { ProblemSet, Shooter, Variant } from './types';

/** 遊び方ごとに使う問題の種類（A・B は standard、C は risk、D は lane、E は rise） */
export function setForVariant(variant: Variant): ProblemSet {
  if (variant === 'C') return 'risk';
  if (variant === 'D') return 'lane';
  if (variant === 'E') return 'rise';
  return 'standard';
}

/**
 * ゲーム全体のコース（#52）。ステージはマリオのワールドのような単元の区切りで、
 * 1つのステージの中で、問題ごとに遊び方（A〜E）が変わる。
 *
 * - はじめの問題（intro）で単元を伝える。ステージ 1・2 は A（タップ）、ステージ 3 からは B（ねらう）
 * - そのあとはメイン（main）。C・D・C・E の順に、間に別の遊び方をはさむ（C:D:E = 2:1:1）
 * - A はゲーム全体で 3 問
 *
 * - 射撃タイプも問題ごとに決める（#46）。展示モードでは、この表の射撃タイプだけを使う
 *   （ふだんの画面では、設定・URL で選んだ射撃タイプを使う）
 *
 * 問題の中身は src/data/problems.json（npm run gen:problems がこの表の問題 id を見て作る）。
 */

/** 単元 */
export type Unit = 'add' | 'sub' | 'muldiv';

/** intro = はじめの、単元を伝える問題。main = メインの問題 */
export type NodeRole = 'intro' | 'main';

export interface CourseNode {
  variant: Variant;
  problemId: string;
  role: NodeRole;
  /**
   * 展示モードで使う射撃タイプ（#46）。A はタップなので null。
   * D・E は的が1段なので輪投げにはしない。C の輪投げは、棒が動かず大きさも同じなので C の特徴は薄れる
   */
  shooter: Shooter | null;
}

export interface CourseStage {
  /** ステージの番号（1 から） */
  stage: number;
  unit: Unit;
  nodes: CourseNode[];
}

export const UNIT_LABEL: Record<Unit, string> = {
  add: 'たしざん',
  sub: 'ひきざん',
  muldiv: 'かけざん・わりざん',
};

const intro = (variant: Variant, problemId: string, shooter: Shooter | null = null): CourseNode => ({ variant, problemId, role: 'intro', shooter });
const main = (variant: Variant, problemId: string, shooter: Shooter): CourseNode => ({ variant, problemId, role: 'main', shooter });

export const COURSE: CourseStage[] = [
  {
    stage: 1,
    unit: 'add',
    // ステージ 1 は前からある足し算の問題を使う（前のログと比べられるように、問題 id もそのまま）
    // 射撃タイプは、いちばんわかりやすいコルク銃から始めて、パチンコに進む
    nodes: [
      intro('A', 'std-1-1'), intro('A', 'std-1-2'),
      main('C', 'risk-1-1', 'gun'), main('D', 'lane-1-1', 'gun'), main('C', 'risk-1-2', 'sling'), main('E', 'rise-1-1', 'sling'),
    ],
  },
  {
    stage: 2,
    unit: 'sub',
    // 輪投げはステージ 2 から
    nodes: [
      intro('A', 'std-s2-1'),
      main('C', 'risk-s2-1', 'ring'), main('D', 'lane-s2-1', 'sling'), main('C', 'risk-s2-2', 'gun'), main('E', 'rise-s2-1', 'gun'),
    ],
  },
  {
    stage: 3,
    unit: 'muldiv',
    nodes: [
      intro('B', 'std-s3-1', 'ring'),
      main('C', 'risk-s3-1', 'sling'), main('D', 'lane-s3-1', 'gun'), main('C', 'risk-s3-2', 'ring'), main('E', 'rise-s3-1', 'sling'),
    ],
  },
];

/** コースの中の位置。stage は COURSE のステージ番号、index はそのステージの中の何問目か（0 から） */
export interface NodeRef {
  stage: number;
  index: number;
}

export function courseStage(stage: number): CourseStage | undefined {
  return COURSE.find((s) => s.stage === stage);
}

export function nodeAt(ref: NodeRef): CourseNode | undefined {
  return courseStage(ref.stage)?.nodes[ref.index];
}

/** マップの番号（例「2-3」＝ステージ 2 の 3 問目）。画面の上・マップ・ログ・URL で使う */
export function mapNo(ref: NodeRef): string {
  return `${ref.stage}-${ref.index + 1}`;
}

/** 「2-3」のような番号を位置にする。コースにない番号は null */
export function parseMapNo(text: string | null | undefined): NodeRef | null {
  const m = /^(\d+)-(\d+)$/.exec(text?.trim() ?? '');
  if (!m) return null;
  const ref = { stage: Number(m[1]), index: Number(m[2]) - 1 };
  return nodeAt(ref) ? ref : null;
}

/** コースの全部の問題を、遊ぶ順に並べたもの */
export function allNodes(): Array<NodeRef & { node: CourseNode }> {
  return COURSE.flatMap((s) => s.nodes.map((node, index) => ({ stage: s.stage, index, node })));
}

/** つぎの問題。最後の問題のつぎは null（マップにもどる） */
export function nextRef(ref: NodeRef): NodeRef | null {
  const list = allNodes();
  const i = list.findIndex((n) => n.stage === ref.stage && n.index === ref.index);
  const next = i >= 0 ? list[i + 1] : undefined;
  return next ? { stage: next.stage, index: next.index } : null;
}

/** そのバリエーションがコースで最初に出てくる位置（前の形の URL `?variant=` を読むため） */
export function firstRefOfVariant(variant: Variant): NodeRef | null {
  const n = allNodes().find((x) => x.node.variant === variant);
  return n ? { stage: n.stage, index: n.index } : null;
}

export const FIRST_REF: NodeRef = { stage: COURSE[0].stage, index: 0 };
