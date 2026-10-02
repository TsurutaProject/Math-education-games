import { useEffect, useMemo, useRef, useState } from 'react';
import { FIELD_H, FIELD_W, hitTest, layoutTargets, targetPosition, type HitCircle } from '../logic/hit';
import { targetLabel } from '../logic/ops';
import type { Op, Problem, Variant } from '../logic/types';
import type { Settings } from './settings';
import { sfxHit, sfxShot, unlockAudio } from './sound';

export interface ShotInfo {
  /** 照準の位置（フィールド単位） */
  aim: { x: number; y: number };
  targetId: string | null;
  /** 当たり判定の倍率 */
  assist: number;
  pointerType: string;
}

interface Props {
  problem: Problem;
  variant: Variant;
  settings: Settings;
  usedIds: string[];
  shotsLeft: number;
  /** false のあいだは撃てない（クリア演出中など） */
  active: boolean;
  onShot: (info: ShotInfo) => void;
}

interface Effect {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: 'hit' | 'miss';
}

/** A でタップを少し大目に拾う（指の太さ分） */
const TAP_TOLERANCE = 1.15;
/** 連打で2発同時に出ないようにする間（ミリ秒） */
const COOLDOWN_MS = 200;

const OP_COLOR: Record<Op, string> = {
  '+': 'var(--op-plus)',
  '-': 'var(--op-minus)',
  '*': 'var(--op-times)',
  '/': 'var(--op-times)',
};

export function Field({ problem, variant, usedIds, shotsLeft, active, onShot }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const placed = useMemo(() => layoutTargets(problem, { riskMode: false }), [problem]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const lastShotAt = useRef(0);
  const effectSeq = useRef(0);

  // 効果（ポップする数字など）は一定時間で消す
  useEffect(() => {
    if (effects.length === 0) return;
    const timer = setTimeout(() => setEffects((list) => list.slice(1)), 700);
    return () => clearTimeout(timer);
  }, [effects]);

  const toField = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const circlesNow = (): HitCircle[] =>
    placed.filter((p) => !usedIds.includes(p.id)).map((p) => ({ id: p.id, ...targetPosition(p, 0, 0), r: p.r }));

  const addEffect = (x: number, y: number, text: string, kind: Effect['kind']) => {
    effectSeq.current += 1;
    setEffects((list) => [...list, { id: effectSeq.current, x, y, text, kind }]);
  };

  const fire = (aim: { x: number; y: number }, targetId: string | null, assist: number, pointerType: string) => {
    lastShotAt.current = performance.now();
    sfxShot();
    if (targetId) {
      const t = problem.targets.find((x) => x.id === targetId)!;
      sfxHit(false);
      const pos = placed.find((p) => p.id === targetId)!;
      addEffect(pos.x, pos.y - pos.r - 10, targetLabel(t.op, t.value), 'hit');
    }
    onShot({ aim, targetId, assist, pointerType });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    unlockAudio();
    if (!active || shotsLeft <= 0) return;
    if (performance.now() - lastShotAt.current < COOLDOWN_MS) return;
    const pt = toField(e);
    if (!pt) return;
    // A：的をタップすれば必ず当たる。何もない所は弾を使わない。
    const hit = hitTest(pt, circlesNow(), TAP_TOLERANCE);
    if (hit) fire(pt, hit, 1, e.pointerType);
  };

  return (
    <div className={`field field-${variant}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
      >
        <rect x={0} y={0} width={FIELD_W} height={FIELD_H} className="booth-bg" />
        {[...new Set(placed.map((p) => p.y))].map((y) => (
          <rect key={y} x={0} y={y + 74} width={FIELD_W} height={16} rx={4} className="shelf" />
        ))}
        {placed.map((p) => {
          const t = problem.targets.find((x) => x.id === p.id)!;
          const down = usedIds.includes(p.id);
          const { x, y } = targetPosition(p, 0, 0);
          return (
            <g key={p.id} transform={`translate(${x} ${y})`}>
              <g className={`target ${down ? 'down' : ''}`}>
                <rect x={-6} y={p.r - 4} width={12} height={78 - p.r} className="stand" />
                <circle r={p.r} fill="var(--target-face)" stroke={OP_COLOR[t.op]} strokeWidth={p.r * 0.16} />
                <circle r={p.r * 0.7} fill="none" stroke={OP_COLOR[t.op]} strokeWidth={2} opacity={0.35} />
                <text className="target-label" fontSize={p.r * 0.62} dy="0.35em" fill={OP_COLOR[t.op]}>
                  {targetLabel(t.op, t.value)}
                </text>
              </g>
            </g>
          );
        })}
        {effects.map((ef) => (
          <text key={ef.id} x={ef.x} y={ef.y} className={`pop pop-${ef.kind}`}>
            {ef.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
