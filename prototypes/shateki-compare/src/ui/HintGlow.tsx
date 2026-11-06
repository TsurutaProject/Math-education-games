import { useRef } from 'react';

/** ヒント（#57）で的を光らせる長さ（ミリ秒）。CSS の .hint-glow のアニメーションと同じ長さ */
export const HINT_GLOW_MS = 3000;

/** ヒントで光らせる的。seq はヒントを押すたびに増える（同じ的でも光り直すように） */
export interface HintMark {
  seq: number;
  targetId: string;
}

/**
 * その的をいま光らせるか。光り始めるのは、その的が画面に出ているとき（D・E は出てきたとき）で、
 * そこから HINT_GLOW_MS だけ光る。一度光り終えたら、同じヒントでは光らない
 * （D で流れていった的が、また流れてきたときに光り直さないように）。
 * 見えている的についてだけ呼ぶ（見えていない的で呼ぶと、そこで光り始めたことになる）。
 */
export function useHintGlow(hint: HintMark | null): (targetId: string) => boolean {
  const tracker = useRef<GlowTracker | null>(null);
  tracker.current ??= createGlowTracker();
  return (targetId) => tracker.current!(hint, targetId);
}

export type GlowTracker = (hint: HintMark | null, targetId: string) => boolean;

/** useHintGlow の中身（時計を差し替えてテストできるように分けた） */
export function createGlowTracker(now: () => number = () => performance.now()): GlowTracker {
  let started: { seq: number; at: number } | null = null;
  return (hint, targetId) => {
    if (!hint || hint.targetId !== targetId) return false;
    const t = now();
    if (started?.seq !== hint.seq) started = { seq: hint.seq, at: t };
    return t - started.at < HINT_GLOW_MS;
  };
}

/** 的のまわりの光る輪。3秒ゆっくり脈打って消える（光り終えても描いたままになる画面でも見えなくなる） */
export function HintGlow({ seq, r, cx = 0, cy = 0 }: { seq: number; r: number; cx?: number; cy?: number }) {
  return <circle key={seq} cx={cx} cy={cy} r={r} className="hint-glow" pointerEvents="none" aria-hidden="true" />;
}
