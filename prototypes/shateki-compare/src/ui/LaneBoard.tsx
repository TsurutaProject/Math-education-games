import { FIELD_H } from '../logic/hit';
import { targetLabel } from '../logic/ops';
import type { Problem } from '../logic/types';
import { Artwork } from './Artwork';
import { OP_ARTWORK, OP_INK } from './artworkAssets';
import './LaneBoard.css';

/**
 * D「ながれる」・E「おきあがる」の札の看板（#62）。フィールドの左の余白に、その問題の札を全部一覧で出す。
 * 札の全部が1画面に出ない遊び方につける。D は流れてくるまでわからない札（はじめは流れない × ÷ など）、
 * E は立っていない札（8 枚のうち立つのは 6 枚）も、ここで最初から見える。
 * 当てた札は薄くして ✓ を付ける。ほかの印（いまレーンにある札など）は付けない。
 * 照準の届かない余白に描く飾りで、撃っても何も起きない。
 */

/** 看板の大きさ（フィールド単位。scale 1 のとき） */
export const BOARD_W = 240;
const PAD = 16;
const TITLE_H = 44;
const CELL_W = (BOARD_W - PAD * 2) / 2;
const CELL_H = 100;
const CARD_R = 40;
/** 看板の上の端の y */
const BOARD_TOP = 60;
/** 看板とフィールドの端（パチンコは壁）とのすき間、画面の端とのすき間 */
const GAP_FIELD = 24;
const GAP_EDGE = 12;
/** これより小さくしないと入らないときは出さない（札の字が読みにくくなるため） */
export const MIN_BOARD_SCALE = 0.75;

export function boardHeight(cards: number): number {
  return PAD + TITLE_H + 12 + Math.ceil(cards / 2) * CELL_H;
}

export interface BoardPlace {
  /** 看板の左の端の x（フィールド単位。マイナス＝左の余白） */
  x: number;
  scale: number;
}

/**
 * 看板を置く場所。SVG の大きさ（画面のピクセル）と viewBox の左の端・幅・高さから、
 * 左の余白（preserveAspectRatio="xMidYMid meet" でできる）の幅を求め、入るように縮める。
 * 余白が狭くて MIN_BOARD_SCALE より縮めないと入らないときは null（出さない）。
 */
export function boardPlace(
  size: { width: number; height: number },
  view: { x: number; width: number; height: number },
): BoardPlace | null {
  if (size.width <= 0 || size.height <= 0) return null;
  const px = Math.min(size.width / view.width, size.height / view.height);
  /** 左の余白の幅（フィールド単位） */
  const margin = (size.width / px - view.width) / 2;
  const scale = Math.min(1, (margin - GAP_FIELD - GAP_EDGE) / BOARD_W);
  if (scale < MIN_BOARD_SCALE) return null;
  return { x: view.x - GAP_FIELD - BOARD_W * scale, scale };
}

interface Props {
  problem: Problem;
  usedIds: ReadonlyArray<string>;
  place: BoardPlace;
  /** 看板の見出し（D「ながれる ふだ」、E「おきあがる ふだ」） */
  title: string;
}

export function LaneBoard({ problem, usedIds, place, title }: Props) {
  const h = boardHeight(problem.targets.length);
  return (
    <g
      className="lane-board"
      transform={`translate(${place.x} ${BOARD_TOP}) scale(${place.scale})`}
      pointerEvents="none"
      role="img"
      aria-label={`${title}：${problem.targets.map((t) => targetLabel(t.op, t.value)).join('、')}`}
    >
      {/* 脚は画面の下の端まで */}
      {[BOARD_W * 0.22, BOARD_W * 0.78].map((x) => (
        <rect key={x} x={x - 7} y={h - 4} width={14} height={(FIELD_H - BOARD_TOP) / place.scale - h + 4} className="lane-board-leg" />
      ))}
      <rect x={0} y={0} width={BOARD_W} height={h} rx={10} className="lane-board-frame" />
      <rect x={8} y={8} width={BOARD_W - 16} height={h - 16} rx={6} className="lane-board-face" />
      <rect x={PAD} y={PAD} width={BOARD_W - PAD * 2} height={TITLE_H - 8} rx={6} className="lane-board-title-bg" />
      <text x={BOARD_W / 2} y={PAD + (TITLE_H - 8) / 2} dy="0.35em" className="lane-board-title">
        {title}
      </text>
      {problem.targets.map((t, i) => {
        const cx = PAD + CELL_W * (i % 2) + CELL_W / 2;
        const cy = PAD + TITLE_H + 12 + CELL_H * Math.floor(i / 2) + CELL_H / 2 - 6;
        const used = usedIds.includes(t.id);
        return (
          <g key={t.id} transform={`translate(${cx} ${cy})`} className={`lane-board-card ${used ? 'used' : ''}`}>
            <g className="lane-board-card-face">
              <Artwork name={OP_ARTWORK[t.op]} x={-CARD_R} y={-CARD_R} width={CARD_R * 2} height={CARD_R * 2} />
              <text className="target-label" fontSize={CARD_R * 0.62} dy="0.35em" fill={OP_INK[t.op]}>
                {targetLabel(t.op, t.value)}
              </text>
            </g>
            {used && (
              <g className="lane-board-check" transform={`translate(${CARD_R * 0.62} ${-CARD_R * 0.62})`}>
                <circle r={14} />
                <path d="M -7 0 L -2 6 L 8 -6" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
