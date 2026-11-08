import type { NodeRef } from './course';

/**
 * はじめの手引き（#15）の手順。マップで 1-1 を撃つところから、1-1 をクリアして「つぎの問題へ」を押すまで。
 * map：マップで 1-1 だけ照らす。goal：式の「＝ 40」（めあて）を照らす。current：式の先頭の 0（いまの数）を照らす。
 * aim：照らした的を1つだけ撃たせる。
 * changed：数が変わったことを見せる。free：残りは自分で選ぶ。next：クリア後に「つぎの問題へ」を光らせる。done：終わり
 */
export type TutorialStep = 'map' | 'goal' | 'current' | 'aim' | 'changed' | 'free' | 'next' | 'done';

/** 手引きをする問題（1-1） */
export const TUTORIAL_REF: NodeRef = { stage: 1, index: 0 };
/** aim の手順で光らせる的（1-1 の ＋20。めあて 40 の半分で「あと 20」がわかりやすい） */
export const TUTORIAL_TARGET = 't3';

/** 1-1 の中で手引きを出す手順 */
export const IN_PROBLEM_STEPS: readonly TutorialStep[] = ['goal', 'current', 'aim', 'changed', 'free', 'next'];

/**
 * パチンコ・輪投げの狙い方の手引き（#15）：その射撃タイプを初めて使う問題と、手引きで撃たせる的（順に）。
 * パチンコ（1-5）：動かない大きい ＋10。輪投げ（2-2）：手前右の ＋5（短く引く）→ 奥左の ＋10（長く斜めに引く）で、
 * 引く長さで奥、向きで左右が変わるのを体験させる。どちらも、残りの1発は自分で選ぶ
 */
export const COACH_PLANS: Record<'sling' | 'ring', { problemId: string; targets: readonly string[] }> = {
  sling: { problemId: 'risk-1-2', targets: ['t4'] },
  ring: { problemId: 'risk-s2-1', targets: ['t6', 't1'] },
};

/** その射撃タイプ・問題で、手引きで撃たせる的。手引きをしない組み合わせなら null */
export function coachTargets(shooter: string, problemId: string): readonly string[] | null {
  const plan = shooter === 'sling' || shooter === 'ring' ? COACH_PLANS[shooter] : undefined;
  return plan && plan.problemId === problemId ? plan.targets : null;
}

/** 撃って当てた的で、手順が進むか。aim で光らせた的に当てたら changed へ */
export function afterShot(step: TutorialStep, targetId: string | null): TutorialStep {
  return step === 'aim' && targetId === TUTORIAL_TARGET ? 'changed' : step;
}

/** 「さいしょから」で戻る手順。光らせた的を撃つ前後なら、もう一度撃たせる */
export function afterRestart(step: TutorialStep): TutorialStep {
  return step === 'changed' ? 'aim' : step;
}

/**
 * 1-1 から出て（マップへ・ほかの問題へ）マップにもどったときの手順。
 * クリアする前に出たら、マップの手順からやり直す。クリアしたあと（next）なら、もう終わりにする
 */
export function afterLeave(step: TutorialStep): TutorialStep {
  if (step === 'next' || step === 'done') return 'done';
  return 'map';
}

/**
 * 手引きを終えた人と、パチンコ・輪投げの狙い方の手引きを見た射撃タイプを、遊ぶ人ごとに覚える。
 * 遊ぶ人の id（ログと同じ。「つぎの人へ」でだけ変わる）と一緒に残すので、再読み込みや、
 * ほかのゲームから戻ってきても、同じ人にはもう出さない。人が変われば、また出す
 */
export interface TutorialMemory {
  player: string;
  done: boolean;
  /** 狙い方の手引きを見た射撃タイプ（sling・ring） */
  pull: string[];
}

export const TUTORIAL_KEY = 'shateki-tutorial-v1';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function loadMemory(store: Store | undefined, player: string): TutorialMemory {
  const fresh = { player, done: false, pull: [] };
  try {
    const raw = store?.getItem(TUTORIAL_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<TutorialMemory>;
    if (saved.player !== player) return fresh;
    return { player, done: saved.done === true, pull: Array.isArray(saved.pull) ? saved.pull.filter((s) => typeof s === 'string') : [] };
  } catch {
    return fresh;
  }
}

export function saveMemory(store: Store | undefined, memory: TutorialMemory): void {
  try {
    store?.setItem(TUTORIAL_KEY, JSON.stringify(memory));
  } catch {
    // 保存できなくても、この起動の間は覚えている
  }
}
