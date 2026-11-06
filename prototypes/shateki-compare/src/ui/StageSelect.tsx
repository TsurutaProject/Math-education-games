import { Artwork } from './Artwork';
import './StageSelect.css';
import { useEffect, useRef, useState } from 'react';
import { COURSE, mapNo, UNIT_LABEL, type CourseNode, type CourseStage, type NodeRef } from '../logic/course';
import { nodeStatus, type NodeStatus } from '../logic/progress';
import type { Zukan } from '../logic/zukan';
import { GunLayer, GUN_MUZZLE } from './GunLayer';
import { playSettings, SHOOTER_LABEL, shooterOf, type Settings } from './settings';
import { sfxMiss, sfxShot, unlockAudio } from './sound';

/**
 * マップの問題の下に出す、射撃タイプの名前。遊び方（動く的など）は出さない
 * （輪投げのように的が動かない射撃タイプもあり、遊び方の名前だと混乱させるため）。
 * 展示モードではコースの表で問題ごとに決めた射撃タイプ、ふだんの画面では今の設定の射撃タイプ（#46）。
 */
export function shooterLabel(node: Pick<CourseNode, 'variant' | 'shooter'>, settings: Settings, exhibit: boolean): string {
  const shooter = shooterOf(node.variant, playSettings(node, settings, exhibit));
  return shooter === 'tap' ? 'タップ' : SHOOTER_LABEL[shooter];
}

interface Props {
  /** いま遊んでいる（最後に遊んだ）問題 */
  current: NodeRef;
  zukan: Zukan;
  /** その人が1発以上撃った問題の id（挑戦済みを出すため） */
  played: ReadonlySet<string>;
  /** 射撃タイプの名前を出すため */
  settings: Settings;
  /** 展示モードなら、問題ごとに決めた射撃タイプの名前を出す */
  exhibit: boolean;
  onSelect: (ref: NodeRef) => void;
  /** 的のないところを撃った（ログ用） */
  onMiss: () => void;
}

/** 問題の丸の上に出す進み具合（#44）。まだ遊んでいない問題には何も出さない */
const STATUS_TEXT: Record<NodeStatus, string> = {
  none: '',
  tried: '挑戦済み',
  cleared: 'クリア',
  complete: '★ クリア',
};

/** 問題の丸の位置。3つずつ横に並べる */
const ROW_GAP = 210;
const position = (i: number) => ({ x: 170 + (i % 3) * 330, y: 110 + Math.floor(i / 3) * ROW_GAP });

function WorldMap({ world, current, zukan, played, settings, exhibit, onSelect, onMiss, onShoot }: Props & { world: CourseStage; onShoot: (point: { x: number; y: number }, miss?: boolean) => boolean }) {
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [shot, setShot] = useState<number | null>(null);
  /** 外れたところに出す「スカッ」（#44）。id を変えて、続けて外しても出し直す */
  const [missAt, setMissAt] = useState<{ id: number; x: number; y: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pointer = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const nodes = world.nodes;
  const rows = Math.ceil(nodes.length / 3);
  const height = Math.max(480, rows * ROW_GAP + 100);
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
    timer.current = setTimeout(() => onSelect({ stage: world.stage, index: i }), 280);
  };
  /** 的のないところを撃った：コルクを飛ばして「スカッ」を出す。問題は選ばない */
  const miss = (p: { x: number; y: number }) => {
    if (timer.current || shot !== null) return;
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    const screen = new DOMPoint(p.x, p.y).matrixTransform(matrix);
    if (!onShoot({ x: screen.x, y: screen.y }, true)) return;
    unlockAudio();
    sfxShot();
    sfxMiss();
    onMiss();
    setMissAt((m) => ({ id: (m?.id ?? 0) + 1, ...p }));
  };
  const point = (event: React.PointerEvent<SVGSVGElement>) => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const cancel = () => { pointer.current = null; setAim(null); };
  return (
      <div className="stage-map-scroll">
        <svg ref={svg} className="stage-map" style={{ minHeight: rows * 160 }} viewBox={`0 0 1000 ${height}`} aria-label={`ステージ${world.stage}の問題マップ`}
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
            else miss(p);
          }} onPointerCancel={cancel} onLostPointerCapture={cancel}>
          <rect width="1000" height={height} fill="var(--booth)" />
          {Array.from({ length: rows }, (_, row) => (
            <rect key={`lane-${row}`} x={36} y={position(row * 3).y + 74} width={928} height={14} rx={5} className="shelf stage-lane" pointerEvents="none" />
          ))}
          {nodes.map((node, i) => {
            const p = position(i);
            const label = mapNo({ stage: world.stage, index: i });
            const status = nodeStatus(zukan, node, played.has(node.problemId));
            const isCurrent = current.stage === world.stage && current.index === i;
            const shooter = shooterLabel(node, settings, exhibit);
            return <g key={node.problemId} transform={`translate(${p.x} ${p.y})`} className={`stage-node ${isCurrent ? 'current' : ''} status-${status}`} role="button" tabIndex={shot === null ? 0 : -1}
              aria-label={`${label} ${shooter} ${STATUS_TEXT[status]}`.trim()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(i); } }}>
              <rect x="-6" y="32" width="12" height="42" rx="3" fill="var(--stand)" />
              <circle r="48" className="stage-target" />
              <Artwork name="target-red" x={-48} y={-48} width={96} height={96} />
              <text textAnchor="middle" y="9" className="stage-node-number">{label}</text>
              <text textAnchor="middle" y="-64" className="stage-node-state">{shot === i ? 'スタート！' : STATUS_TEXT[status]}</text>
              <text textAnchor="middle" y="114" className="stage-node-play">{shooter}</text>
            </g>;
          })}
          {missAt && <text key={missAt.id} x={missAt.x} y={missAt.y} className="pop pop-miss" pointerEvents="none">スカッ</text>}
          {aim && <g className="reticle" transform={`translate(${aim.x} ${aim.y})`} pointerEvents="none"><circle r="24" /><line x1={-35} x2={35} y1={0} y2={0} /><line x1={0} x2={0} y1={-35} y2={35} /><circle r="3" className="dot" /></g>}
        </svg>
      </div>
  );
}


export function StageSelect(props: Props) {
  const [world, setWorld] = useState(() => Math.max(0, COURSE.findIndex((s) => s.stage === props.current.stage)));
  const pages = useRef<HTMLDivElement>(null);
  const fixedLayer = useRef<SVGSVGElement>(null);
  const [shot, setShot] = useState<{ id: number; x: number; y: number } | null>(null);
  const shotStarted = useRef(false);
  const missTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (missTimer.current) clearTimeout(missTimer.current); }, []);
  /** コルクを飛ばす。外れ（miss）なら、少したってからまた撃てるようにする */
  const onShoot = (screen: { x: number; y: number }, miss = false) => {
    if (shotStarted.current) return false;
    const matrix = fixedLayer.current?.getScreenCTM();
    if (!matrix) return false;
    const target = new DOMPoint(screen.x, screen.y).matrixTransform(matrix.inverse());
    shotStarted.current = true;
    setShot((s) => ({ id: (s?.id ?? 0) + 1, x: target.x, y: target.y }));
    if (miss) {
      missTimer.current = setTimeout(() => {
        shotStarted.current = false;
        setShot(null);
      }, 450);
    }
    return true;
  };
  // 開いたときは、いまの問題があるステージのページを出す
  useEffect(() => {
    const el = pages.current;
    if (el) el.scrollLeft = world * (el.firstElementChild?.clientWidth ?? el.clientWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goTo = (i: number) => {
    const el = pages.current;
    if (el) el.scrollTo({ left: i * (el.firstElementChild?.clientWidth ?? el.clientWidth), behavior: 'smooth' });
  };
  const last = COURSE.length - 1;
  return (
    <main className="stage-select">
      <div className="stage-select-heading">
        <div><h1>ステージを えらぼう</h1><p>左右に スクロールして 移動。まとを ねらって はなそう！</p></div>

      </div>
      <div className={`stage-map-viewport ${shot ? 'is-shooting' : ''}`}>
        <button className="stage-edge-arrow stage-edge-prev" aria-label="前のステージ" disabled={shot !== null || world === 0} onClick={() => goTo(world - 1)}>‹</button>
        <button className="stage-edge-arrow stage-edge-next" aria-label="次のステージ" disabled={shot !== null || world === last} onClick={() => goTo(world + 1)}>›</button>
      <div className="stage-pages" ref={pages} tabIndex={0} aria-label="左右にスクロールしてステージを選択"
        onScroll={(event) => {
          const el = event.currentTarget;
          setWorld(Math.max(0, Math.min(last, Math.round(el.scrollLeft / (el.firstElementChild?.clientWidth ?? el.clientWidth)))));
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            goTo(Math.max(0, Math.min(last, world + (event.key === 'ArrowRight' ? 1 : -1))));
          }
        }}>
        {COURSE.map((s) => <section className="stage-page" key={s.stage} aria-label={`ステージ ${s.stage} ${UNIT_LABEL[s.unit]}`}>
          <h2 className="stage-world-title">ステージ {s.stage}　<span className="stage-world-unit">{UNIT_LABEL[s.unit]}</span></h2>
          <WorldMap {...props} world={s} onShoot={onShoot} />
        </section>)}
      </div>
        <svg ref={fixedLayer} className="stage-fixed-layer" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <GunLayer />
          {shot && <g key={shot.id}><Artwork name="cork" x={-7} y={-9} width={14} height={18} /><animateMotion dur="0.25s" fill="freeze" path={`M${GUN_MUZZLE.x} ${GUN_MUZZLE.y} L${shot.x} ${shot.y}`} /></g>}
        </svg>
      </div>

    </main>
  );
}
