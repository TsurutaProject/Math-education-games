import { useEffect, useMemo, useRef, useState } from 'react';
import {
  assistMultiplier,
  FIELD_H,
  FIELD_W,
  hitTest,
  layoutTargets,
  swayOffset,
  targetPosition,
  type HitCircle,
} from '../logic/hit';
import { targetLabel } from '../logic/ops';
import { clampAngle, launchBall, launchFromPull, stepBall, type Ball, type Launch } from '../logic/sling';
import type { Op, Problem, Variant } from '../logic/types';
import type { Settings } from './settings';
import { SlingLayer } from './SlingLayer';
import { sfxHit, sfxMiss, sfxShot, sfxSling, unlockAudio } from './sound';

export interface ShotInfo {
  /** 照準の位置（フィールド単位） */
  aim: { x: number; y: number };
  targetId: string | null;
  /** 当たり判定の倍率 */
  assist: number;
  pointerType: string;
  /** パチンコのときだけ */
  launch?: { angleDeg: number; pull: number; flightMs: number; bounces: number };
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
  /** コルクが飛んでいく先 */
  tx: number;
  ty: number;
  /** 文字を出す位置 */
  x: number;
  y: number;
  text: string;
  kind: 'hit' | 'miss';
  /** コルクが飛ぶ線を出すか（パチンコは弾そのものが見えているので出さない） */
  trail: boolean;
}

interface Aim {
  pointerId: number;
  pointerType: string;
  x: number;
  y: number;
  /** パチンコ：押しはじめた位置（ここからの引っ張りで向きを決める） */
  sx: number;
  sy: number;
}

interface Flight {
  ball: Ball;
  launch: Launch;
  startedAt: number;
  pointerType: string;
  assist: number;
  trail: Array<{ x: number; y: number }>;
}

/** A でタップを少し大目に拾う（指の太さ分） */
const TAP_TOLERANCE = 1.15;
/** 連打で2発同時に出ないようにする間（ミリ秒）。C は倒れるのを見せるため長め。 */
const COOLDOWN_MS: Record<Variant, number> = { A: 200, B: 250, C: 550 };
/** タッチのとき、指で隠れないように照準を指より上に出す（フィールド単位） */
const TOUCH_AIM_OFFSET = 90;
/** パチンコの揺れ：照準の揺れ幅 1 あたり何度ぶれるか */
const SLING_SWAY_DEG = 0.2;
/** コルクが飛び出す位置（画面の下の真ん中） */
const MUZZLE = { x: FIELD_W / 2, y: FIELD_H + 40 };

const OP_COLOR: Record<Op, string> = {
  '+': 'var(--op-plus)',
  '-': 'var(--op-minus)',
  '*': 'var(--op-times)',
  '/': 'var(--op-times)',
};

export function Field({ problem, variant, settings, usedIds, shotsLeft, active, onShot }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const riskMode = variant === 'C';
  const aimMode = variant !== 'A';
  const slingMode = aimMode && settings.shooter === 'sling';
  const placed = useMemo(
    () => layoutTargets(problem, { riskMode, sizeScale: settings.cSizeScale, singleRow: slingMode }),
    [problem, riskMode, settings.cSizeScale, slingMode],
  );
  const speed = riskMode ? settings.cMoveSpeed : 0;
  const [effects, setEffects] = useState<Effect[]>([]);
  const [aim, setAim] = useState<Aim | null>(null);
  const [shaking, setShaking] = useState(0);
  const lastShotAt = useRef(0);
  const effectSeq = useRef(0);
  /** 倒れた的は当たった場所で止める */
  const downAt = useRef(new Map<string, { x: number; y: number }>());
  /** パチンコ：飛んでいる弾（1発ずつ） */
  const flight = useRef<Flight | null>(null);
  /** 毎フレーム呼ぶ処理（最新の props を使うため、描画のたびに入れ替える） */
  const onFrame = useRef<(dt: number) => void>(() => {});

  // ---- 時計（動く的・照準の揺れ用）。C は当たった瞬間に少し止める（ヒットストップ）。
  const [clock, setClock] = useState(0);
  const clockRef = useRef(0);
  const freezeUntil = useRef(0);
  const needsClock = aimMode || speed > 0;
  useEffect(() => {
    if (!needsClock) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now >= freezeUntil.current) {
        clockRef.current += dt;
        onFrame.current(dt);
      }
      setClock(clockRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [needsClock]);

  // やり直しなどで消えたあとに、飛んでいた弾が1発ぶんとして数えられないようにする
  useEffect(
    () => () => {
      flight.current = null;
      onFrame.current = () => {};
    },
    [],
  );

  // 効果（ポップする数字など）は一定時間で消す
  useEffect(() => {
    if (effects.length === 0) return;
    const timer = setTimeout(() => setEffects((list) => list.slice(1)), 700);
    return () => clearTimeout(timer);
  }, [effects]);

  useEffect(() => {
    if (!shaking) return;
    const timer = setTimeout(() => setShaking(0), 300);
    return () => clearTimeout(timer);
  }, [shaking]);

  // 撃てなくなったら照準を消す
  useEffect(() => {
    if (!active) setAim(null);
  }, [active]);

  const positionOf = (id: string, t: number) => {
    const p = placed.find((x) => x.id === id)!;
    return downAt.current.get(id) ?? targetPosition(p, t, speed);
  };

  const toField = (e: React.PointerEvent): { x: number; y: number } | null => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const circlesAt = (t: number): HitCircle[] =>
    placed.filter((p) => !usedIds.includes(p.id)).map((p) => ({ id: p.id, ...targetPosition(p, t, speed), r: p.r }));

  const addEffect = (to: { x: number; y: number }, x: number, y: number, text: string, kind: Effect['kind']) => {
    effectSeq.current += 1;
    setEffects((list) => [...list, { id: effectSeq.current, tx: to.x, ty: to.y, x, y, text, kind, trail: !slingMode }]);
  };

  const canShoot = () =>
    active &&
    shotsLeft > 0 &&
    !flight.current &&
    performance.now() - lastShotAt.current >= (slingMode ? 0 : COOLDOWN_MS[variant]);

  const assistNow = () => (riskMode && !settings.assistInC ? 1 : assistMultiplier(shotsLeft, settings.assistStrength));

  const fire = (
    point: { x: number; y: number },
    targetId: string | null,
    assist: number,
    pointerType: string,
    launch?: ShotInfo['launch'],
  ) => {
    lastShotAt.current = performance.now();
    if (!launch) sfxShot();
    if (targetId) {
      const t = problem.targets.find((x) => x.id === targetId)!;
      const pos = positionOf(targetId, clockRef.current);
      const r = placed.find((p) => p.id === targetId)!.r;
      downAt.current.set(targetId, pos);
      addEffect(pos, pos.x, pos.y - r - 10, targetLabel(t.op, t.value), 'hit');
      sfxHit(riskMode);
      if (riskMode) {
        freezeUntil.current = performance.now() + 110;
        setShaking((s) => s + 1);
      }
    } else {
      addEffect(point, point.x, point.y, 'スカッ', 'miss');
      sfxMiss();
    }
    onShot({ aim: point, targetId, assist, pointerType, launch });
  };

  // パチンコ：弾を進めて、的に当たるか外に出たら1発ぶんを確定する
  onFrame.current = (dt: number) => {
    const f = flight.current;
    if (!f) return;
    const r = stepBall(f.ball, dt, circlesAt(clockRef.current), { bounce: settings.slingBounce, multiplier: f.assist });
    f.trail = [...f.trail.slice(-5), { x: f.ball.x, y: f.ball.y }];
    f.ball = r.ball;
    if (!r.hit && !r.exited) return;
    flight.current = null;
    const launch = {
      angleDeg: Math.round(f.launch.angleDeg * 10) / 10,
      pull: Math.round(f.launch.pull),
      flightMs: Math.round(performance.now() - f.startedAt),
      bounces: r.ball.bounces,
    };
    // 外れの「スカッ」は画面の中に出す
    const point = r.hit
      ? { x: r.ball.x, y: r.ball.y }
      : { x: Math.max(40, Math.min(FIELD_W - 40, r.ball.x)), y: Math.max(40, Math.min(FIELD_H - 40, r.ball.y)) };
    fire(point, r.hit, f.assist, f.pointerType, launch);
  };

  /** パチンコの飛ぶ角度（引っ張りの向き + 揺れ）。引っ張りが短いときは null */
  const slingLaunchOf = (a: Aim): Launch | null => {
    const l = launchFromPull(a.x - a.sx, a.y - a.sy);
    if (!l) return null;
    const jitter = swayOffset(clockRef.current, settings.swayAmplitude).dx * SLING_SWAY_DEG;
    return { ...l, angleDeg: clampAngle(l.angleDeg + jitter) };
  };

  /** 照準の最終位置（指の位置 + タッチのずれ + 揺れ） */
  const reticleOf = (a: Aim) => {
    const { dx, dy } = swayOffset(clockRef.current, settings.swayAmplitude);
    const offset = a.pointerType === 'touch' ? TOUCH_AIM_OFFSET : 0;
    return { x: a.x + dx, y: a.y - offset + dy };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    unlockAudio();
    if (!canShoot()) return;
    const pt = toField(e);
    if (!pt) return;
    if (!aimMode) {
      // A：的をタップすれば必ず当たる。何もない所は弾を使わない。
      const hit = hitTest(pt, circlesAt(clockRef.current), TAP_TOLERANCE);
      if (hit) fire(pt, hit, 1, e.pointerType);
      return;
    }
    if (aim) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 合成イベントなどでキャプチャできなくても狙えるようにする
    }
    setAim({ pointerId: e.pointerId, pointerType: e.pointerType, ...pt, sx: pt.x, sy: pt.y });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!aim || e.pointerId !== aim.pointerId) return;
    const pt = toField(e);
    if (pt) setAim({ ...aim, ...pt });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!aim || e.pointerId !== aim.pointerId) return;
    setAim(null);
    if (!canShoot()) return;
    if (slingMode) {
      // 短く引いただけなら撃たない（弾も減らない）
      const launch = slingLaunchOf(aim);
      if (!launch) return;
      sfxSling();
      flight.current = {
        ball: launchBall(launch.angleDeg, settings.slingSpeed),
        launch,
        startedAt: performance.now(),
        pointerType: aim.pointerType,
        assist: assistNow(),
        trail: [],
      };
      return;
    }
    const point = reticleOf(aim);
    const assist = assistNow();
    const hit = hitTest(point, circlesAt(clockRef.current), assist);
    fire(point, hit, assist, aim.pointerType);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (aim && e.pointerId === aim.pointerId) setAim(null);
  };

  const reticle = aim && !slingMode ? reticleOf(aim) : null;
  const slingLaunch = aim && slingMode ? slingLaunchOf(aim) : null;
  const f = flight.current;
  const firstShot = shotsLeft === problem.shots;
  const rowYs = [...new Set(placed.map((p) => p.y))];

  return (
    <div className={`field field-${variant} ${shaking ? 'shake' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <rect x={0} y={0} width={FIELD_W} height={FIELD_H} className="booth-bg" />
        {rowYs.map((y) => (
          <rect key={y} x={0} y={y + 74} width={FIELD_W} height={16} rx={4} className="shelf" />
        ))}
        {placed.map((p) => {
          const t = problem.targets.find((x) => x.id === p.id)!;
          const down = usedIds.includes(p.id);
          const { x, y } = positionOf(p.id, clock);
          const standH = Math.max(10, 78 - p.r);
          return (
            <g key={p.id} transform={`translate(${x} ${y})`}>
              {riskMode && p.amp > 0 && !down && (
                <line x1={-p.amp - x + p.x} x2={p.amp - x + p.x} y1={78} y2={78} className="rail" />
              )}
              <g className={`target ${down ? (riskMode ? 'down heavy' : 'down') : ''}`}>
                <rect x={-6} y={p.r - 4} width={12} height={standH + 4} className="stand" />
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
          <g key={ef.id}>
            {ef.trail && (
              <circle r={7} className="cork-shot">
                <animateMotion dur="0.12s" fill="freeze" path={`M${MUZZLE.x},${MUZZLE.y} L${ef.tx},${ef.ty}`} />
              </circle>
            )}
            <text x={ef.x} y={ef.y} className={`pop pop-${ef.kind} ${riskMode ? 'pop-big' : ''}`}>
              {ef.text}
            </text>
          </g>
        ))}
        {aim && reticle && (
          <g className="reticle" transform={`translate(${reticle.x} ${reticle.y})`}>
            <circle r={26} />
            <line x1={-38} x2={-12} y1={0} y2={0} />
            <line x1={12} x2={38} y1={0} y2={0} />
            <line x1={0} x2={0} y1={-38} y2={-12} />
            <line x1={0} x2={0} y1={12} y2={38} />
            <circle r={3} className="dot" />
          </g>
        )}
        {slingMode && (
          <SlingLayer
            pull={aim ? { dx: aim.x - aim.sx, dy: aim.y - aim.sy } : null}
            angleDeg={slingLaunch?.angleDeg ?? null}
            guideLength={settings.slingGuide}
            bounce={settings.slingBounce}
            flying={f ? { x: f.ball.x, y: f.ball.y, trail: f.trail } : null}
            loaded={!f && shotsLeft > 0 && active}
          />
        )}
        {aim && slingMode && (
          <>
            <circle cx={aim.sx} cy={aim.sy} r={18} className="pull-anchor" />
            <line x1={aim.sx} y1={aim.sy} x2={aim.x} y2={aim.y} className="pull-line" />
          </>
        )}
        {aim && (slingMode || aim.pointerType === 'touch') && <circle cx={aim.x} cy={aim.y} r={14} className="finger" />}
        {aimMode && firstShot && !aim && !f && active && (
          <text x={FIELD_W / 2} y={slingMode ? 44 : FIELD_H - 18} className="hint">
            {slingMode ? 'ゆびで おして うしろに ひっぱり、はなすと とぶ！' : 'ゆびで おして ねらって、はなすと うつ！'}
          </text>
        )}
      </svg>
    </div>
  );
}
