import type { Problem } from './types';

export interface Point3 { x: number; y: number; z: number }
export const RING_INNER = 62;
export const RING_OUTER = 70;
export const PEG_HEIGHT = 150;
export const PEG_RADIUS = 32;
export const POLE_RADIUS = 5;
export const SIGN_HALF_THICKNESS = 3;
export const RING_TUBE = (RING_OUTER - RING_INNER) / 2;
export const RING_RADIUS = (RING_OUTER + RING_INNER) / 2;
export const RING_FROM: Point3 = { x: 0, y: -210, z: 210 };
const SIN = Math.sin(Math.atan2(550, 1050));
const COS = Math.cos(Math.atan2(550, 1050));

/** yは奥行き、zは床からの高さ。床・影・的・輪を同じカメラで投影する。 */
export function projectRing(p: Point3) {
  const depth = (p.y + 650) * COS + (550 - p.z) * SIN;
  const scale = 800 / depth;
  return { x: 500 + p.x * scale, y: 260 - ((p.y + 650) * SIN + (p.z - 550) * COS) * scale, scale };
}

export function ringPegs(problem: Problem) {
  const columns = Math.ceil(problem.targets.length / 3);
  const rows = Math.ceil(problem.targets.length / columns);
  return problem.targets.map((target, i) => {
    const row = Math.floor(i / columns);
    const count = Math.min(columns, problem.targets.length - row * columns);
    return { ...target, x: (i % columns - (count - 1) / 2) * 300, y: 100 + (rows - 1 - row) * 380, z: PEG_HEIGHT };
  });
}

export interface RingThrow { x: number; y: number; pull: number; duration: number }
export interface RingPeg { id: string; x: number; y: number; available?: boolean }
export interface RingContact { t: number; point: Point3; normal: Point3; kind: 'sign' | 'pole' | 'floor'; id: string | null }
export interface RingPlan {
  frames: { t: number; point: Point3 }[];
  contacts: RingContact[];
  hit: string | null;
  /** もう入っている棒を囲んで落ちたとき、その棒。hit は null（同じ演算を2回足さない） */
  repeat: string | null;
  endTime: number;
  landing: Point3;
}
const DRAG = 3;
const GRAVITY = 2080;
const ARC_VELOCITY = 1040 - RING_FROM.z;
const RING_SAMPLES = Array.from({ length: 96 }, (_, i) => ({ x: Math.cos(i * Math.PI * 2 / 96) * RING_RADIUS, y: Math.sin(i * Math.PI * 2 / 96) * RING_RADIUS }));
const distance2 = (a: Point3, b: RingPeg) => Math.hypot(a.x - b.x, a.y - b.y);

/** 床に落ちた輪が囲んでいる棒。輪の内側に棒がすっぽり入っていれば囲んでいる。 */
export function encircledPeg<T extends RingPeg>(landing: Point3, pegs: ReadonlyArray<T>): T | undefined {
  return pegs.find((peg) => distance2(landing, peg) + POLE_RADIUS < RING_INNER);
}

export function aimRing(dx: number, dy: number, duration = 1): RingThrow | null {
  const pull = Math.hypot(dx, dy);
  if (pull < 12) return null;
  return { x: Math.max(-440, Math.min(440, -dx * 5)), y: Math.max(0, Math.min(1120, dy * 8)), pull, duration: Math.max(.3, duration) };
}

/** 空中の初期軌道。横速度は空気抵抗で減衰し、高さは重力で変化する。 */
export function ringPoint(shot: RingThrow, t: number): Point3 {
  const u = (1 - Math.exp(-DRAG * t)) / (1 - Math.exp(-DRAG));
  return { x: RING_FROM.x + (shot.x - RING_FROM.x) * u, y: RING_FROM.y + (shot.y - RING_FROM.y) * u, z: RING_FROM.z + ARC_VELOCITY * t - GRAVITY * t * t / 2 };
}

/** 有限円柱の符号付き距離。札はy軸方向の厚み6、棒はz軸方向の半径5の円柱。 */
function solidDistance(point: Point3, peg: RingPeg, kind: 'sign' | 'pole') {
  const radial = kind === 'sign'
    ? Math.hypot(point.x - peg.x, point.z - PEG_HEIGHT) - PEG_RADIUS
    : Math.hypot(point.x - peg.x, point.y - peg.y) - POLE_RADIUS;
  const axial = kind === 'sign'
    ? Math.abs(point.y - peg.y) - SIGN_HALF_THICKNESS
    : Math.abs(point.z - PEG_HEIGHT / 2) - PEG_HEIGHT / 2;
  return Math.hypot(Math.max(0, radial), Math.max(0, axial)) + Math.min(Math.max(radial, axial), 0);
}

/** 輪を太さ8のトーラスとして扱い、穴の空間を衝突対象から外す。 */
export function ringContactAt(center: Point3, pegs: ReadonlyArray<RingPeg>): Omit<RingContact, 't'> & { penetration: number } | null {
  for (const peg of pegs) {
    if (distance2(center, peg) > RING_OUTER + PEG_RADIUS + 2 || center.z > PEG_HEIGHT + PEG_RADIUS + RING_TUBE + 1 || center.z < -RING_TUBE) continue;
    for (const kind of ['sign', 'pole'] as const) {
      if (kind === 'pole' && center.z > PEG_HEIGHT + RING_TUBE + 1) continue;
      let best = Infinity;
      let closest = center;
      for (const offset of RING_SAMPLES) {
        const point = { x: center.x + offset.x, y: center.y + offset.y, z: center.z };
        const d = solidDistance(point, peg, kind);
        if (d < best) { best = d; closest = point; }
      }
      // 96分割の弧の近似誤差（約0.04）より少し広い接触余白。
      if (best > RING_TUBE + .08) continue;
      const epsilon = .01;
      const gradient = (axis: 'x' | 'y' | 'z') => solidDistance({ ...closest, [axis]: closest[axis] + epsilon }, peg, kind) - solidDistance({ ...closest, [axis]: closest[axis] - epsilon }, peg, kind);
      const normal = { x: gradient('x'), y: gradient('y'), z: gradient('z') };
      const length = Math.hypot(normal.x, normal.y, normal.z);
      if (length < 1e-8) normal.z = 1;
      else { normal.x /= length; normal.y /= length; normal.z /= length; }
      return { point: closest, normal, kind, id: peg.id, penetration: Math.max(0, RING_TUBE - best) + .12 };
    }
  }
  return null;
}

/**
 * 予測も実投もこの1回の空間シミュレーションを再生する。表示フレーム数に依存しない。
 * 入ったかどうかは、床に落ちたときに輪が棒を囲んでいるかだけで決める。途中で札や棒に当たっても外れにしない。
 */
export function traceRing(shot: RingThrow, pegs: ReadonlyArray<RingPeg>): RingPlan {
  let point = { ...RING_FROM };
  let velocity = { x: (shot.x - point.x) * DRAG / (1 - Math.exp(-DRAG)), y: (shot.y - point.y) * DRAG / (1 - Math.exp(-DRAG)), z: ARC_VELOCITY };
  let t = 0;
  let floorBounces = 0;
  let hit: string | null = null;
  let repeat: string | null = null;
  const frames = [{ t: 0, point: { ...point } }];
  const contacts: RingContact[] = [];
  while (t < 2.5) {
    // 1ステップの移動を最大1単位に抑え、厚み6の札・太さ8の輪のすり抜けを防ぐ。
    const dt = Math.min(1 / 360, 1 / (Math.hypot(velocity.x, velocity.y, velocity.z) + GRAVITY / 360));
    const damping = Math.exp(-DRAG * dt);
    point = { x: point.x + velocity.x * (1 - damping) / DRAG, y: point.y + velocity.y * (1 - damping) / DRAG, z: point.z + velocity.z * dt - GRAVITY * dt * dt / 2 };
    velocity = { x: velocity.x * damping, y: velocity.y * damping, z: velocity.z - GRAVITY * dt };
    t += dt;
    const contact = ringContactAt(point, pegs);
    if (contact) {
      const { normal } = contact;
      const dot = velocity.x * normal.x + velocity.y * normal.y + velocity.z * normal.z;
      if (dot < 0) {
        velocity = { x: velocity.x - 1.25 * dot * normal.x, y: velocity.y - 1.25 * dot * normal.y, z: velocity.z - 1.25 * dot * normal.z };
        contacts.push({ t, point: { ...point }, normal, id: contact.id, kind: contact.kind });
      }
      point = { x: point.x + normal.x * contact.penetration, y: point.y + normal.y * contact.penetration, z: point.z + normal.z * contact.penetration };
    }
    if (point.z <= RING_TUBE && velocity.z < 0) {
      point.z = RING_TUBE;
      contacts.push({ t, point: { ...point }, normal: { x: 0, y: 0, z: 1 }, kind: 'floor', id: null });
      const caught = encircledPeg(point, pegs);
      if (caught) {
        if (caught.available === false) repeat = caught.id;
        else hit = caught.id;
        break;
      }
      if (++floorBounces >= 2 || Math.abs(velocity.z) < 50) break;
      velocity.z *= -.18;
      velocity.x *= .55;
      velocity.y *= .55;
    }
    // 衝突の境界も保存し、描画の補間で物体を横切らせない。
    if (t - frames[frames.length - 1].t >= 1 / 120 || contact) frames.push({ t, point: { ...point } });
  }
  frames.push({ t, point: { ...point } });
  return { frames, contacts, hit, repeat, endTime: t, landing: { ...point } };
}

export function ringPlanPoint(plan: RingPlan, t: number): Point3 {
  if (t >= plan.endTime) return plan.landing;
  let lo = 0;
  let hi = plan.frames.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (plan.frames[mid].t <= t) lo = mid; else hi = mid; }
  const a = plan.frames[lo]; const b = plan.frames[hi];
  const u = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t || 1)));
  return { x: a.point.x + (b.point.x - a.point.x) * u, y: a.point.y + (b.point.y - a.point.y) * u, z: a.point.z + (b.point.z - a.point.z) * u };
}
