import { targetLabel } from '../logic/ops';
import type { Op } from '../logic/types';

import { Artwork } from './Artwork';
import { OP_ARTWORK, OP_INK } from './artworkAssets';

interface Props {
  op: Op;
  value: number;
  r: number;
  /** 倒れる・起き上がるなどの見た目（.target に足すクラス） */
  className?: string;
}

/** 的1つ（支柱・円・札の文字）。中心が (0, 0) になるように描く */
export function TargetMark({ op, value, r, className = '' }: Props) {
  const standH = Math.max(10, 78 - r);
  return (
    <g className={`target ${className}`}>
      <rect x={-6} y={r - 4} width={12} height={standH + 4} className="stand" />
      <Artwork name={OP_ARTWORK[op]} x={-r} y={-r} width={r * 2} height={r * 2} />
      <text className="target-label" fontSize={Math.max(18, r * 0.62)} dy="0.35em" fill={OP_INK[op]}>
        {targetLabel(op, value)}
      </text>
    </g>
  );
}
