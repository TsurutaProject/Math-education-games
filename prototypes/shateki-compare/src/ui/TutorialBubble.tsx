import type { ReactNode } from 'react';
import './Tutorial.css';

/**
 * はじめの手引き（#15）の吹き出し。手順の言葉と、つぎへ進むボタン（あれば）と「とばす」を出す。
 * 置き場所は親が決める（className で位置を足す）
 */
export function TutorialBubble({ children, okLabel = 'わかった', onOk, onSkip, className = '' }: {
  children: ReactNode;
  okLabel?: string;
  /** なければ、つぎへ進むボタンを出さない（光らせたものを撃つ・押す手順） */
  onOk?: () => void;
  onSkip: () => void;
  className?: string;
}) {
  return (
    <div className={`tutorial-bubble ${className}`} role="status" aria-live="polite">
      <p className="tutorial-text">{children}</p>
      <div className="tutorial-buttons">
        {onOk && <button className="btn primary tutorial-ok" onClick={onOk} autoFocus>{okLabel}</button>}
        <button className="btn ghost small tutorial-skip" onClick={onSkip}>とばす</button>
      </div>
    </div>
  );
}

/** 手引きで、撃ってほしい的のまわりにずっと出す光る輪（ヒントの光と違い、消えない） */
export function TutorialGlow({ r, cx = 0, cy = 0 }: { r: number; cx?: number; cy?: number }) {
  return <circle cx={cx} cy={cy} r={r} className="tutorial-glow" pointerEvents="none" aria-hidden="true" />;
}

/**
 * パチンコ・輪投げの最初の1発の前に出す、指の手引き（#15）。指が押して、下に引っ張って、はなすと弾が上へ飛ぶ、をくり返す。
 * 見せるだけで、押しても何も起きない（その下のフィールドで撃てる）
 */
export function PullGuide({ kind }: { kind: 'sling' | 'ring' }) {
  return (
    <div className={`pull-guide pull-guide-${kind}`} aria-hidden="true">
      <span className="pull-guide-shot" />
      <span className="pull-guide-band" />
      {/* 絵文字は PC によって出ないので、フィールドで指の位置に出す丸と同じ形で描く */}
      <span className="pull-guide-finger" />
    </div>
  );
}
