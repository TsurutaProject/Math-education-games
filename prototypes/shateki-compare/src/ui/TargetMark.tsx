import { targetLabel } from '../logic/ops';
import type { Op } from '../logic/types';

const OP_COLOR: Record<Op, string> = {
  '+': 'var(--op-plus)',
  '-': 'var(--op-minus)',
  '*': 'var(--op-times)',
  '/': 'var(--op-times)',
};

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
      <circle r={r} fill="var(--target-face)" stroke={OP_COLOR[op]} strokeWidth={r * 0.16} />
      <circle r={r * 0.7} fill="none" stroke={OP_COLOR[op]} strokeWidth={2} opacity={0.35} />
      <text className="target-label" fontSize={r * 0.62} dy="0.35em" fill={OP_COLOR[op]}>
        {targetLabel(op, value)}
      </text>
    </g>
  );
}
