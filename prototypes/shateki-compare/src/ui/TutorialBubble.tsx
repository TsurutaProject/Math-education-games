import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import './Tutorial.css';

/**
 * はじめの手引き（#15）の吹き出し。短い言葉と、つぎへ進むボタン（あれば）。「とばす」は角に小さく出す。
 * 置き場所は親が決める（className・style）
 */
export function TutorialBubble({ children, okLabel = 'わかった', onOk, onSkip, className = '', style, bubbleRef }: {
  children: ReactNode;
  okLabel?: string;
  /** なければ、つぎへ進むボタンを出さない（照らしたところを撃つ・押す手順） */
  onOk?: () => void;
  onSkip: () => void;
  className?: string;
  style?: CSSProperties;
  bubbleRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={bubbleRef} className={`tutorial-bubble ${className}`} style={style} role="status" aria-live="polite">
      <p className="tutorial-text">{children}</p>
      {onOk && <button className="btn primary tutorial-ok" onClick={onOk} autoFocus>{okLabel}</button>}
      <button className="tutorial-skip" onClick={onSkip}>とばす</button>
    </div>
  );
}

/** 手引きで、撃ってほしい的のまわりにずっと出す光る輪（ヒントの光と違い、消えない） */
export function TutorialGlow({ r, cx = 0, cy = 0 }: { r: number; cx?: number; cy?: number }) {
  return <circle cx={cx} cy={cy} r={r} className="tutorial-glow" pointerEvents="none" aria-hidden="true" />;
}

interface Box { left: number; top: number; width: number; height: number }

/** 画面の上での、その要素の位置。見つからなければ null */
function boxOf(selector: string, pad: number): Box | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

/**
 * 画面を暗くして、selector の要素だけを明るく残し、黄色い枠で光らせる（ケーキのチュートリアルと同じ見せ方）。
 * 要素が動いても（動く的・画面の大きさが変わる）毎フレーム追いかける。吹き出しは、照らしたところの下（入らなければ上）に出す。
 * 暗いところも押せる（止めたいときは、押した側で何も起きないようにする）。tap なら、照らしたところを指がたたくアニメを重ねる
 */
export function Spotlight({ selector, pad = 10, round = false, tap = false, children, onOk, okLabel, onSkip }: {
  selector: string;
  pad?: number;
  /** 丸く照らす（的） */
  round?: boolean;
  tap?: boolean;
  children: ReactNode;
  onOk?: () => void;
  okLabel?: string;
  onSkip: () => void;
}) {
  const [box, setBox] = useState<Box | null>(null);
  // 吹き出しの大きさ（画面からはみ出さないように置くため）
  const bubble = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const next = boxOf(selector, pad);
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      const el = bubble.current;
      if (el) setSize((prev) => (prev.width === el.offsetWidth && prev.height === el.offsetHeight ? prev : { width: el.offsetWidth, height: el.offsetHeight }));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [selector, pad]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = box ? box.left + box.width / 2 : vw / 2;
  const below = box ? box.top + box.height + 18 : vh / 2;
  const above = box ? box.top - 18 : vh / 2;
  // 下に入らなければ上に出す。左右は画面の中に収める
  const h = size.height || 80;
  const placeAbove = !!box && below + h + 16 > vh && above - h > 16;
  const bubbleStyle: CSSProperties = {
    left: Math.max(16, Math.min(vw - 16 - size.width, cx - size.width / 2)),
    top: placeAbove ? above - h : below,
    transform: 'none',
  };
  const holeStyle: CSSProperties = box
    ? { left: box.left, top: box.top, width: box.width, height: box.height, borderRadius: round ? '50%' : 16 }
    : { left: vw / 2, top: vh / 2, width: 0, height: 0 };
  return (
    <>
      <div className={`spotlight-hole ${box ? '' : 'spotlight-none'}`} style={holeStyle} aria-hidden="true" />
      {tap && box && <span className="spotlight-tap" style={{ left: cx, top: box.top + box.height / 2 }} aria-hidden="true" />}
      <TutorialBubble bubbleRef={bubble} className="tutorial-coach" style={bubbleStyle} onOk={onOk} okLabel={okLabel} onSkip={onSkip}>{children}</TutorialBubble>
    </>
  );
}

interface Pt { x: number; y: number }

/**
 * パチンコ・輪投げの狙い方の手引き（#15）。フィールドの SVG の中に描く。
 * フィールドを暗くし、撃ってほしい的（holes）と、押すところ（start）から「ここまで引く」（end）までを明るく残す。
 * 狙っていないあいだは、指が start から end へ引っ張るアニメをくり返す。end まで引くと（locked）「ここで はなして！」
 */
export function PullCoach({ start, end, locked, aiming, holes, view }: {
  start: Pt;
  end: Pt;
  locked: boolean;
  aiming: boolean;
  holes: Array<Pt & { r: number }>;
  view: { x: number; y: number; width: number; height: number };
}) {
  const id = `pull-coach-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const label = locked ? 'ここで はなして！' : aiming ? 'まるまで ひっぱって' : 'おして ひっぱる';
  // 言葉は押すところの上に出す（引くのは下向きなので、道すじと重ならない）。左右は画面の中に収める
  const labelX = Math.max(view.x + 150, Math.min(view.x + view.width - 150, start.x));
  return (
    <g className={`pull-coach ${locked ? 'locked' : ''}`} pointerEvents="none" aria-hidden="true">
      <defs>
        <mask id={id}>
          <rect x={view.x} y={view.y} width={view.width} height={view.height} fill="white" />
          {holes.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r={h.r} fill="black" />)}
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="black" strokeWidth={120} strokeLinecap="round" />
        </mask>
      </defs>
      <rect x={view.x} y={view.y} width={view.width} height={view.height} className="pull-coach-shade" mask={`url(#${id})`} />
      {holes.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r={h.r - 8} className="tutorial-glow" />)}
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="pull-coach-path" />
      <circle cx={start.x} cy={start.y} r={18} className="pull-coach-start" />
      <circle cx={end.x} cy={end.y} r={26} className="pull-coach-end" />
      {!aiming && (
        <circle r={20} className="pull-coach-finger">
          <animate attributeName="cx" values={`${start.x};${start.x};${end.x};${end.x}`} keyTimes="0;0.2;0.7;1" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="cy" values={`${start.y};${start.y};${end.y};${end.y}`} keyTimes="0;0.2;0.7;1" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.75;1" dur="2.2s" repeatCount="indefinite" />
        </circle>
      )}
      <text x={labelX} y={start.y - 48} textAnchor="middle" className="pull-coach-label">{label}</text>
    </g>
  );
}

/** 狙い方の手引きで、引いた先が end の近くに来たら、そこで止める（固定する）距離と、離れたら止めるのをやめる距離 */
export const COACH_LOCK_R = 28;
export const COACH_UNLOCK_R = 80;

/**
 * 狙い方の手引き：いまの指の位置 p から、引いた先（照準の位置）と、止めているかを決める。
 * end の近く（lockR）に来たら end に固定する。固定したあとは、大きく離れる（COACH_UNLOCK_R）まで固定したまま
 */
export function coachPull(p: Pt, end: Pt, wasLocked: boolean, lockR = COACH_LOCK_R): { x: number; y: number; locked: boolean } {
  const d = Math.hypot(p.x - end.x, p.y - end.y);
  const locked = d <= lockR || (wasLocked && d <= COACH_UNLOCK_R);
  // p は DOMPoint のことがある（x・y が継承されたゲッターで、{ ...p } だと空になり NaN になる）ので、明示的に取り出す
  return locked ? { x: end.x, y: end.y, locked } : { x: p.x, y: p.y, locked };
}
