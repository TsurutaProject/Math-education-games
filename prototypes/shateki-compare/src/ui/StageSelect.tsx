import { Artwork } from './Artwork';
import './StageSelect.css';
import { useEffect, useRef, useState } from 'react';
import { problemsFor, setForVariant, stagesFor } from '../logic/problems';
import type { Variant } from '../logic/types';
import type { Zukan } from '../logic/zukan';
import { GunLayer, GUN_MUZZLE } from './GunLayer';
import { sfxShot, unlockAudio } from './sound';
import { VARIANTS } from './settings';

/** 問題の追加時も、元のステージ番号・配列の順序から通し番号を作る。 */
export function stageNodes(variant: Variant) {
  const set = setForVariant(variant);
  return stagesFor(set).flatMap((stage) => problemsFor(set, stage).map((problem, index) => ({ stage, index, problem })));
}

/** マップの番号（例「2-5」）。ステージ（＝バリエーション）の順番と、その中の何問目か。画面の上とログで使う。 */
export function mapLabel(variant: Variant, problemId: string): string {
  return `${VARIANTS.indexOf(variant) + 1}-${stageNodes(variant).findIndex((n) => n.problem.id === problemId) + 1}`;
}

interface Props {
  variant: Variant;
  stage: number;
  index: number;
  zukan: Zukan;
  onSelect: (variant: Variant, stage: number, index: number) => void;
}

function WorldMap({ world, variant, stage, index, zukan, onSelect, onShoot }: Props & { world: Variant; onShoot: (point: { x: number; y: number }) => boolean }) {
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [shot, setShot] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const nodes = stageNodes(world);
  const worldNumber = VARIANTS.indexOf(world) + 1;
  const rows = Math.ceil(nodes.length / 3);
  const height = Math.max(480, rows * 180 + 120);
  const position = (i: number) => ({ x: 170 + (i % 3) * 330, y: 110 + Math.floor(i / 3) * 180 });
  const select = (i: number) => {
    if (timer.current || shot !== null) return;
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    const target = position(i);
    const screen = new DOMPoint(target.x, target.y).matrixTransform(matrix);
    if (!onShoot({ x: screen.x, y: screen.y })) return;
    unlockAudio();
    sfxShot();
    setShot(i);
    setAim(null);
    timer.current = setTimeout(() => onSelect(world, nodes[i].stage, nodes[i].index), 280);
  };
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const cancel = () => { pointer.current = null; setAim(null); };
  const cleared = (id: string) => [...zukan].some(([key, entries]) => key.startsWith(`${world}:`) || key.startsWith(`${world}-`) ? key.endsWith(`:${id}`) && entries.length > 0 : false);
  return (
      <div className="stage-map-scroll">
        <svg ref={svg} className="stage-map" style={{ minHeight: rows * 150 }} viewBox={`0 0 1000 ${height}`} aria-label={`ステージ${worldNumber}の問題マップ`}
          onPointerDown={(event) => {
            if (pointer.current !== null || shot !== null || event.button !== 0) return;
            if (event.pointerType !== 'touch') event.preventDefault();
            unlockAudio(); pointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId); setAim(point(event));
          }}
          onPointerMove={(event) => { if (pointer.current === event.pointerId) setAim(point(event)); }}
          onPointerUp={(event) => {
            if (pointer.current !== event.pointerId) return;
            const p = point(event); cancel(); event.currentTarget.releasePointerCapture(event.pointerId);
            if (!p) return;
            const hit = nodes.findIndex((_, i) => Math.hypot(position(i).x - p.x, position(i).y - p.y) <= 48);
            if (hit >= 0) select(hit);
          }} onPointerCancel={cancel} onLostPointerCapture={cancel}>
          <rect width="1000" height={height} fill="var(--booth)" />
          {Array.from({ length: rows }, (_, row) => (
            <rect key={`lane-${row}`} x={36} y={position(row * 3).y + 74} width={928} height={14} rx={5} className="shelf stage-lane" pointerEvents="none" />
          ))}
          {nodes.map((node, i) => {
            const p = position(i); const done = cleared(node.problem.id);
            const current = world === variant && node.stage === stage && node.index === index;
            return <g key={node.problem.id} transform={`translate(${p.x} ${p.y})`} className={`stage-node ${current ? 'current' : ''} ${done ? 'cleared' : ''}`} role="button" tabIndex={shot === null ? 0 : -1}
              aria-label={`${worldNumber}-${i + 1}${done ? ' クリア済み' : ''}`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(i); } }}>
              <rect x="-6" y="32" width="12" height="42" rx="3" fill="var(--stand)" />
              <circle r="48" className="stage-target" />
              <Artwork name="target-red" x={-48} y={-48} width={96} height={96} />
              <text textAnchor="middle" y="9" className="stage-node-number">{worldNumber}-{i + 1}</text>
              <text textAnchor="middle" y="-64" className="stage-node-state">{shot === i ? 'スタート！' : done ? '★ クリア' : current ? 'いま ここ' : i === 0 ? 'START' : i === nodes.length - 1 ? 'GOAL' : ''}</text>
            </g>;
          })}
          {aim && <g className="reticle" transform={`translate(${aim.x} ${aim.y})`} pointerEvents="none"><circle r="24" /><line x1={-35} x2={35} y1={0} y2={0} /><line x1={0} x2={0} y1={-35} y2={35} /><circle r="3" className="dot" /></g>}
        </svg>
      </div>
  );
}


export function StageSelect(props: Props) {
  const [world, setWorld] = useState(props.variant);
  const pages = useRef<HTMLDivElement>(null);
  const fixedLayer = useRef<SVGSVGElement>(null);
  const [shot, setShot] = useState<{ x: number; y: number } | null>(null);
  const shotStarted = useRef(false);
  const onShoot = (screen: { x: number; y: number }) => {
    if (shotStarted.current) return false;
    const matrix = fixedLayer.current?.getScreenCTM();
    if (!matrix) return false;
    const target = new DOMPoint(screen.x, screen.y).matrixTransform(matrix.inverse());
    shotStarted.current = true;
    setShot({ x: target.x, y: target.y });
    return true;
  };
  useEffect(() => {
    const el = pages.current;
    if (el) el.scrollLeft = VARIANTS.indexOf(props.variant) * (el.firstElementChild?.clientWidth ?? el.clientWidth);
  }, [props.variant]);
  const goTo = (i: number) => {
    const el = pages.current;
    if (el) el.scrollTo({ left: i * (el.firstElementChild?.clientWidth ?? el.clientWidth), behavior: 'smooth' });
  };
  return (
    <main className="stage-select">
      <div className="stage-select-heading">
        <div><h1>ステージを えらぼう</h1><p>左右に スクロールして 移動。まとを ねらって はなそう！</p></div>

      </div>
      <div className={`stage-map-viewport ${shot ? 'is-shooting' : ''}`}>
        <button className="stage-edge-arrow stage-edge-prev" aria-label="前のステージ" disabled={shot !== null || world === VARIANTS[0]} onClick={() => goTo(VARIANTS.indexOf(world) - 1)}>‹</button>
        <button className="stage-edge-arrow stage-edge-next" aria-label="次のステージ" disabled={shot !== null || world === VARIANTS[VARIANTS.length - 1]} onClick={() => goTo(VARIANTS.indexOf(world) + 1)}>›</button>
      <div className="stage-pages" ref={pages} tabIndex={0} aria-label="左右にスクロールしてメインステージを選択"
        onScroll={(event) => {
          const el = event.currentTarget;
          setWorld(VARIANTS[Math.max(0, Math.min(VARIANTS.length - 1, Math.round(el.scrollLeft / (el.firstElementChild?.clientWidth ?? el.clientWidth))))]);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(Math.max(0, Math.min(VARIANTS.length - 1, VARIANTS.indexOf(world) + (event.key === 'ArrowRight' ? 1 : -1))));
          }
        }}>
        {VARIANTS.map((v) => <section className="stage-page" key={v} aria-label={`ステージ ${VARIANTS.indexOf(v) + 1}`}>
          <h2 className="stage-world-title">ステージ {VARIANTS.indexOf(v) + 1}</h2>
          <WorldMap {...props} world={v} onShoot={onShoot} />
        </section>)}
      </div>
        <svg ref={fixedLayer} className="stage-fixed-layer" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <GunLayer />
          {shot && <g><Artwork name="cork" x={-7} y={-9} width={14} height={18} /><animateMotion dur="0.25s" fill="freeze" path={`M${GUN_MUZZLE.x} ${GUN_MUZZLE.y} L${shot.x} ${shot.y}`} /></g>}
        </svg>
      </div>

    </main>
  );
}
