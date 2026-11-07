import type { NodeRef } from './course';

/**
 * はじめの手引き（#15）の手順。マップで 1-1 を撃つところから、1-1 をクリアして「つぎの問題へ」を押すまで。
 * map：マップで 1-1 だけ光らせる。goal：めあての数を見せる。aim：光らせた的を1つだけ撃たせる。
 * changed：数が変わったことを見せる。free：残りは自分で選ぶ。next：クリア後に「つぎの問題へ」を光らせる。done：終わり
 */
export type TutorialStep = 'map' | 'goal' | 'aim' | 'changed' | 'free' | 'next' | 'done';

/** 手引きをする問題（1-1） */
export const TUTORIAL_REF: NodeRef = { stage: 1, index: 0 };
/** aim の手順で光らせる的（1-1 の ＋20。めあて 40 の半分で「あと 20」がわかりやすい） */
export const TUTORIAL_TARGET = 't3';

/** 1-1 の中で手引きを出す手順 */
export const IN_PROBLEM_STEPS: readonly TutorialStep[] = ['goal', 'aim', 'changed', 'free', 'next'];

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
 * 手引きを終えた人と、パチンコ・輪投げの指の手引きを見た射撃タイプを、遊ぶ人ごとに覚える。
 * 遊ぶ人の id（ログと同じ。「つぎの人へ」でだけ変わる）と一緒に残すので、再読み込みや、
 * ほかのゲームから戻ってきても、同じ人にはもう出さない。人が変われば、また出す
 */
export interface TutorialMemory {
  player: string;
  done: boolean;
  /** 指の手引きを見た射撃タイプ（sling・ring） */
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
