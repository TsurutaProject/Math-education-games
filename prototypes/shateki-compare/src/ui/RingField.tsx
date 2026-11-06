import './RingField.css';
import { AmmoLayer } from './AmmoLayer';
import { Artwork } from './Artwork';
import { FestivalDecor } from './FestivalDecor';
import { OP_ARTWORK, OP_INK } from './artworkAssets';
import { useEffect, useMemo, useRef, useState } from 'react';
import { aimRing, PEG_HEIGHT, PEG_RADIUS, POLE_RADIUS, projectRing, RING_FROM, RING_INNER, RING_OUTER, RING_TUBE, ringPegs, ringPlanPoint, traceRing, type Point3, type RingPlan, type RingThrow } from '../logic/ring';
import { targetLabel } from '../logic/ops';
import type { Problem, Variant } from '../logic/types';
import type { ShotInfo } from './Field';
import { INSTRUCTION, type Settings } from './settings';
import { sfxHit, sfxRingThrow, sfxThud, unlockAudio } from './sound';

interface Props {
  problem: Problem; variant: Variant; settings: Settings; usedIds: string[];
  calc: import('../logic/ops').Calc; shotsLeft: number; active: boolean; onShot: (info: ShotInfo) => void;
}
function ringPath(center: Point3, radius: number, start = 0, end = Math.PI * 2) {
  return Array.from({ length: 41 }, (_, i) => {
    const a = start + (end - start) * i / 40;
    const p = projectRing({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius, z: center.z });
    return `${i ? 'L' : 'M'}${p.x},${p.y}`;
  }).join(' ');
}
function Ring({ center, dashed = false, start = 0, end = Math.PI * 2 }: { center: Point3; dashed?: boolean; start?: number; end?: number }) {
  return <path d={ringPath(center, (RING_INNER + RING_OUTER) / 2, start, end)} fill="none" stroke="var(--accent)" strokeWidth={(RING_OUTER - RING_INNER) * projectRing(center).scale} strokeDasharray={dashed ? '6 6' : undefined} />;
}
export function RingField({ problem, variant, settings, usedIds, shotsLeft, active, onShot }: Props) {
  const [aim, setAim] = useState<{ sx: number; sy: number; x: number; y: number; pointer: number; downAt: number } | null>(null);
  const [flying, setFlying] = useState<{ plan: RingPlan; t: number } | null>(null);
  const [settled, setSettled] = useState<Record<string, Point3>>({});
  const [feedback, setFeedback] = useState<{ id: number; text: string; kind: 'hit' | 'miss' | 'note'; x: number; y: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const feedbackSeq = useRef(0);
  /** 入ったときに画面を揺らす（ほかの射撃タイプと同じ手応え） */
  const [shaking, setShaking] = useState(0);
  const flight = useRef<{ shot: RingThrow; plan: RingPlan; start: number; pointerType: string; aimMs: number } | null>(null);
  const props = useRef({ onShot, active, usedIds });
  props.current = { onShot, active, usedIds };
  const pegs = useMemo(() => ringPegs(problem), [problem]);
  const solids = useMemo(() => pegs.map((p) => ({ ...p, available: !usedIds.includes(p.id) })), [pegs, usedIds]);
  useEffect(() => {
    if (!shaking) return;
    const timer = setTimeout(() => setShaking(0), 300);
    return () => clearTimeout(timer);
  }, [shaking]);
  // この試案では棒を固定し、奥行きと輪の通過位置を比較できるようにする。
  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const f = flight.current;
      if (f) {
        const t = Math.min(f.plan.endTime, (now - f.start) / (1000 * f.shot.duration));
        setFlying({ plan: f.plan, t });
        if (t >= f.plan.endTime) {
          flight.current = null;
          const hitPeg = pegs.find((p) => p.id === f.plan.hit);
          const repeatPeg = pegs.find((p) => p.id === f.plan.repeat);
          const screen = projectRing(hitPeg ?? f.plan.landing);
          // 入ったら札の上に足した数、同じ棒なら札の上に一言、外れたら落ちた場所に「おしい！」
          const id = (feedbackSeq.current += 1);
          const signOf = (p: typeof pegs[number]) => projectRing({ ...p, y: p.y - 3, z: PEG_HEIGHT + PEG_RADIUS });
          if (hitPeg) {
            const sign = signOf(hitPeg);
            // 大きい数字（56px）が上に上がっても切れないよう、奥の棒でも上の端から 80 は空ける
            setFeedback({ id, text: targetLabel(hitPeg.op, hitPeg.value), kind: 'hit', x: sign.x, y: Math.max(80, sign.y - 12) });
          } else if (repeatPeg) {
            const sign = signOf(repeatPeg);
            setFeedback({ id, text: 'おなじ ぼうは 1かいだけ', kind: 'note', x: Math.max(170, Math.min(830, sign.x)), y: sign.y - 12 });
          } else {
            const at = projectRing(f.plan.landing);
            setFeedback({ id, text: 'おしい！', kind: 'miss', x: at.x, y: at.y - 16 });
          }
          if (f.plan.hit) { sfxHit(); setShaking((s) => s + 1); setSettled((old) => ({ ...old, [f.plan.hit!]: f.plan.landing })); } else sfxThud();
          props.current.onShot({ aim: screen, targetId: f.plan.hit, assist: 1, pointerType: f.pointerType, aimMs: f.aimMs,
            launch: { angleDeg: Math.round(Math.atan2(f.shot.x, f.shot.y - RING_FROM.y) * 1800 / Math.PI) / 10, pull: Math.round(f.shot.pull), flightMs: Math.round(f.shot.duration * f.plan.endTime * 1000), landing: projectRing(f.plan.landing) } });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [problem, variant]);
  const point = (e: React.PointerEvent<SVGSVGElement>) => {
    const matrix = e.currentTarget.getScreenCTM();
    return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : null;
  };
  const preview = useMemo(() => aim ? aimRing(aim.x - aim.sx, aim.y - aim.sy, settings.ringTime) : null, [aim, settings.ringTime]);
  // 予測は的・棒のない空間で計算する。実投ではsolidsとの衝突を判定する。
  const previewPlan = useMemo(() => preview ? traceRing(preview, []) : null, [preview]);
  const from = projectRing(RING_FROM);
  const floor = [{ x: -540, y: -120, z: 0 }, { x: 540, y: -120, z: 0 }, { x: 540, y: 1120, z: 0 }, { x: -540, y: 1120, z: 0 }];
  const floorLine = (a: Point3, b: Point3) => { const p = projectRing(a); const q = projectRing(b); return `M${p.x} ${p.y}L${q.x} ${q.y}`; };
  const ringPosition = flying && !(flying.t >= flying.plan.endTime && flying.plan.hit && usedIds.includes(flying.plan.hit)) ? ringPlanPoint(flying.plan, flying.t) : null;
  const drawPeg = (p: typeof pegs[number]) => {
    const top = projectRing({ ...p, y: p.y - 3 }); const bottom = projectRing({ ...p, z: 0 }); const done = usedIds.includes(p.id);
    const color = OP_INK[p.op];
    const restingRing = settled[p.id] ?? { ...p, z: RING_TUBE };
    const signTop = projectRing({ ...p, y: p.y - 3, z: PEG_HEIGHT + PEG_RADIUS });
    const signBottom = projectRing({ ...p, y: p.y - 3, z: PEG_HEIGHT - PEG_RADIUS });
    const poleLeft = projectRing({ ...p, x: p.x - POLE_RADIUS, z: 0 });
    const poleRight = projectRing({ ...p, x: p.x + POLE_RADIUS, z: 0 });
    const poleTopLeft = projectRing({ ...p, x: p.x - POLE_RADIUS });
    const poleTopRight = projectRing({ ...p, x: p.x + POLE_RADIUS });
    return <g key={p.id} className="ring-peg" aria-label={`${targetLabel(p.op, p.value)}${done ? ' 入った' : ''}`}>
      <path d={ringPath({ ...p, z: 0 }, 32)} fill="var(--stand)" opacity=".24" />
      {done && <path d={ringPath(restingRing, 66, 0, Math.PI)} fill="none" stroke="var(--accent)" strokeWidth={8 * bottom.scale} />}
      <polygon points={[poleLeft, poleRight, poleTopRight, poleTopLeft].map((q) => `${q.x},${q.y}`).join(' ')} fill="var(--stand)" />
      <Artwork name={OP_ARTWORK[p.op]} x={top.x - PEG_RADIUS * top.scale} y={signTop.y} width={PEG_RADIUS * 2 * top.scale} height={signBottom.y - signTop.y} />
      <text x={top.x} y={top.y} dy=".35em" textAnchor="middle" fill={color} fontWeight="800" fontSize={24 * top.scale}>{targetLabel(p.op, p.value)}</text>
      {done && <path d={ringPath(restingRing, 66, Math.PI, Math.PI * 2)} fill="none" stroke="var(--accent)" strokeWidth={8 * bottom.scale} />}
    </g>;
  };
  return <div className={`field ring-field ${shaking ? 'shake' : ''}`}><svg ref={svg} viewBox="0 0 1000 480" aria-label="輪投げ・奥行きのある床と的"
    onPointerDown={(e) => { unlockAudio(); if (!active || !shotsLeft || flight.current || aim || e.button !== 0) return; const p = point(e); if (!p) return; e.currentTarget.setPointerCapture(e.pointerId); setFeedback(null); setFlying(null); setAim({ sx: p.x, sy: p.y, x: p.x, y: p.y, pointer: e.pointerId, downAt: performance.now() }); }}
    onPointerMove={(e) => { if (aim?.pointer !== e.pointerId) return; const p = point(e); if (p) setAim({ ...aim, x: p.x, y: p.y }); }}
    onPointerUp={(e) => { if (aim?.pointer !== e.pointerId) return; const p = point(e); const shot = p ? aimRing(p.x - aim.sx, p.y - aim.sy, settings.ringTime) : null; setAim(null); if (shot && active) { sfxRingThrow(); flight.current = { shot, plan: traceRing(shot, solids), start: performance.now(), pointerType: e.pointerType, aimMs: Math.round(performance.now() - aim.downAt) }; } }}
    onPointerCancel={() => setAim(null)} onLostPointerCapture={() => setAim(null)}>
    <rect width="1000" height="480" fill="var(--booth)" />
    <FestivalDecor instruction={INSTRUCTION.ring} instructionX={215} />
    <polygon points={floor.map((p) => { const q = projectRing(p); return `${q.x},${q.y}`; }).join(' ')} fill="var(--ring-floor, var(--booth))" />
    {[-450, -150, 150, 450].map((x) => <path key={x} d={floorLine({ x, y: -120, z: 0 }, { x, y: 1120, z: 0 })} className="ring-grid" />)}
    {[100, 480, 860, 1120].map((y) => <path key={y} d={floorLine({ x: -540, y, z: 0 }, { x: 540, y, z: 0 })} className="ring-grid" />)}
    {previewPlan && settings.ringShowLanding && <g className="ring-preview" pointerEvents="none">
      <path d={previewPlan.frames.map((f, i) => { const p = projectRing(f.point); return `${i ? 'L' : 'M'}${p.x},${p.y}`; }).join(' ')} className="ring-guide" />
      <g className="ring-landing"><Ring center={previewPlan.landing} dashed /></g>
    </g>}
    {ringPosition && <g pointerEvents="none">
      <path d={ringPath({ ...ringPosition, z: 0 }, 66)} fill="var(--stand)" opacity=".2" />
      <path d={floorLine({ ...ringPosition, z: 0 }, ringPosition)} stroke="var(--muted)" strokeDasharray="3 5" opacity=".5" />
    </g>}
    {[...pegs.map((p) => ({ y: p.y, key: p.id, render: drawPeg(p) })), ...(ringPosition ? [{ y: ringPosition.y + 30, key: 'ring-back', render: <Ring center={ringPosition} start={0} end={Math.PI} /> }, { y: ringPosition.y - 30, key: 'ring-front', render: <Ring center={ringPosition} start={Math.PI} end={Math.PI * 2} /> }] : [])].sort((a, b) => b.y - a.y).map((item) => <g key={item.key}>{item.render}</g>)}
    {!flight.current && (!flying || flying.t >= flying.plan.endTime) && shotsLeft > 0 && active && <Ring center={RING_FROM} />}
    <line x1={from.x + 22} y1="478" x2={from.x} y2={from.y + 8} stroke="var(--stand)" strokeWidth="12" strokeLinecap="round" />
    <AmmoLayer x={770} y={437} shots={problem.shots} shotsLeft={shotsLeft} kind="ring" />
    {feedback && <text key={feedback.id} x={feedback.x} y={feedback.y} className={`pop pop-${feedback.kind} ${feedback.kind === 'note' ? '' : 'pop-big'}`}>{feedback.text}</text>}
  </svg></div>;
}
