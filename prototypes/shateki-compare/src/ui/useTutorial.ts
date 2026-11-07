import { useRef, useState } from 'react';
import { loadMemory, saveMemory, type TutorialMemory, type TutorialStep } from '../logic/tutorial';
import { logSessionEvent } from './logStore';

function storage(): Storage | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

/**
 * はじめの手引き（#15）の手順を持つ。終えたら、遊ぶ人の id と一緒にブラウザに覚え、同じ人には二度と出さない
 * （再読み込みや、ほかのゲームから戻ってきても）。「つぎの人へ」のあとは reset で新しい人の分を読み直す。
 * enabled（設定の「はじめの手引き」）が false のあいだは、いつも done を返す
 */
export function useTutorial(playerId: string, enabled: boolean) {
  const memory = useRef<TutorialMemory | null>(null);
  memory.current ??= loadMemory(storage(), playerId);
  const [step, setStep] = useState<TutorialStep>(() => (memory.current!.done ? 'done' : 'map'));
  const since = useRef(performance.now());

  const go = (to: TutorialStep, skipped = false) => {
    if (to === step) return;
    const now = performance.now();
    logSessionEvent({ type: 'tutorial', step: to, from: step, fromMs: Math.round(now - since.current), skipped });
    since.current = now;
    setStep(to);
    if (to === 'done' && memory.current) {
      memory.current = { ...memory.current, done: true };
      saveMemory(storage(), memory.current);
    }
  };

  /** 新しい人になった：その人の分を読み直して、はじめから */
  const reset = (player: string) => {
    memory.current = loadMemory(storage(), player);
    since.current = performance.now();
    setStep(memory.current.done ? 'done' : 'map');
  };

  return { step: enabled ? step : ('done' as TutorialStep), go, reset };
}
