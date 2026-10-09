import { FIELD_W } from './hit';
import { enumerateSolutions } from './solver';
import type { Problem, Target } from './types';

/**
 * D「ながれる」のレーン（回転寿司のように的が流れる）の計算。描画には依存しない。
 *
 * レーンには「スロット」（的の置き場所）が等間隔に並び、左から右へ流れる。
 * 右の画面外まで行ったスロットは、左の画面外に戻ってくる（1周）。
 * 札（的に書かれた演算子＋数）が入れ替わるのは、スロットが1周して画面外にいるときだけ。
 */

/** レーンの高さ（的の中心の y）。パチンコの1段と同じ */
export const LANE_Y = 240;
/** 画面に同時に出す的の数の範囲。多すぎると画面外の余白が的の大きさより小さくなる */
export const MIN_VISIBLE = 3;
export const MAX_VISIBLE = 6;

export interface LaneGeometry {
  /** スロットの数（画面に出る数 + 画面外の1つ） */
  slots: number;
  /** スロットの間隔（フィールド単位） */
  spacing: number;
  /** 1周の長さ */
  loop: number;
}

/**
 * 画面に出る的の数から、スロットの間隔と1周の長さを決める。
 * 1周 = 画面の幅 + 間隔1つぶん。スロットの中心は −間隔/2 〜 画面の幅+間隔/2 を流れるので、
 * 1周して戻る瞬間は、的の半径が間隔/2 より小さければ画面の外にいる。
 */
export function laneGeometry(visible: number): LaneGeometry {
  const n = Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, Math.round(visible)));
  const spacing = FIELD_W / n;
  return { slots: n + 1, spacing, loop: spacing * (n + 1) };
}

/** 時刻 t（秒）までにスロット i が進んだ距離。speed はフィールド単位/秒 */
function travelled(i: number, t: number, geo: LaneGeometry, speed: number): number {
  return i * geo.spacing + Math.max(0, speed) * t;
}

/** スロット i の中心の x。−間隔/2 〜 画面の幅+間隔/2 */
export function slotX(i: number, t: number, geo: LaneGeometry, speed: number): number {
  const d = travelled(i, t, geo, speed) % geo.loop;
  return d - geo.spacing / 2;
}

/** スロット i が何周したか。増えたら「画面外を通って左に戻った」 */
export function slotLap(i: number, t: number, geo: LaneGeometry, speed: number): number {
  return Math.floor(travelled(i, t, geo, speed) / geo.loop);
}

/**
 * いまの数で、この札をレーンに出してよいか。
 * 計算の途中でマイナスにしないため、「−〇」は 〇 がいまの数以下のときだけ。
 * 0 のときの ×2 は当てても何も変わらないので出さない。
 */
export function canShow(target: Target, current: number): boolean {
  if (target.op === '-') return target.value <= current;
  if (target.op === '*' || target.op === '/') return current !== 0;
  return true;
}

/**
 * 届くために役立つ札：いまの状態から、マイナスを通らずに目標まで届く撃ち方の、1発目になる札。
 * 救済（役立つ札がしばらく出ていなければ流す）に使う。
 */
export function usefulCards(
  problem: Problem,
  current: number,
  usedIds: ReadonlyArray<string>,
  shotsLeft: number,
): Set<string> {
  const ids = new Set<string>();
  for (const s of enumerateSolutions(problem, current, usedIds, shotsLeft)) {
    if (s.nonNegative) ids.add(s.targets[0].id);
  }
  return ids;
}

/** スロットの的が倒れている理由。hit = 当てた、invalid = 引けなくなったので倒した */
export type DownReason = 'hit' | 'invalid';

export interface LaneSlot {
  /** 乗っている札の id（出せる札がなければ null = 空のスロット） */
  cardId: string | null;
  down: DownReason | null;
  /** 札を置いたときの周回数 */
  lap: number;
}

export interface LaneState {
  slots: LaneSlot[];
  /** 札ごとに、最後にレーンに置いた時刻（いちばん長く出ていない札から選ぶため） */
  lastShown: Record<string, number>;
  /** 役立つ札が最後に立っていた時刻 */
  lastUsefulAt: number;
}

export interface LaneContext {
  problem: Problem;
  geo: LaneGeometry;
  /** 流れる速さ（フィールド単位/秒） */
  speed: number;
  current: number;
  usedIds: ReadonlyArray<string>;
  /** usefulCards の結果（毎フレーム計算しないよう、呼ぶ側で用意する） */
  useful: ReadonlySet<string>;
  /** 役立つ札がこの秒数出ていなければ、次にそれを流す。0 で救済なし */
  assistSec: number;
  rng: () => number;
}

/** 時刻 t（ゲーム開始時は 0）のレーンを作る。全部のスロットに札を置く */
export function createLane(ctx: LaneContext, t = 0): LaneState {
  let state: LaneState = { slots: [], lastShown: {}, lastUsefulAt: t };
  for (let i = 0; i < ctx.geo.slots; i++) {
    state = { ...state, slots: [...state.slots, { cardId: null, down: null, lap: slotLap(i, t, ctx.geo, ctx.speed) }] };
    state = placeCard(state, i, t, ctx);
  }
  return refreshUseful(state, t, ctx);
}

/**
 * 時刻 t までレーンを進める。毎フレーム呼ぶ。
 * - いまの数で引けなくなった札は倒す（札は画面外で入れ替える）
 * - 1周して左の画面外に戻ったスロットには、新しい札を置く
 */
export function stepLane(state: LaneState, t: number, ctx: LaneContext): LaneState {
  let next = invalidate(state, ctx);
  for (let i = 0; i < next.slots.length; i++) {
    if (slotLap(i, t, ctx.geo, ctx.speed) > next.slots[i].lap) next = placeCard(next, i, t, ctx);
  }
  return refreshUseful(next, t, ctx);
}

/** 当てた札のスロットを倒す（倒れたまま画面外まで流れる） */
export function markHit(state: LaneState, cardId: string): LaneState {
  const i = state.slots.findIndex((s) => s.cardId === cardId && !s.down);
  if (i < 0) return state;
  return { ...state, slots: replaceAt(state.slots, i, { ...state.slots[i], down: 'hit' }) };
}

/** 立っている（当てられる）札の id とスロット番号 */
export function standingCards(state: LaneState): Array<{ slot: number; cardId: string }> {
  const list: Array<{ slot: number; cardId: string }> = [];
  state.slots.forEach((s, slot) => {
    if (s.cardId && !s.down) list.push({ slot, cardId: s.cardId });
  });
  return list;
}

/** いまの数で引けなくなった、立っている札を倒す */
function invalidate(state: LaneState, ctx: LaneContext): LaneState {
  let changed = false;
  const slots = state.slots.map((s) => {
    if (!s.cardId || s.down) return s;
    const target = findTarget(ctx.problem, s.cardId);
    if (target && canShow(target, ctx.current)) return s;
    changed = true;
    return { ...s, down: 'invalid' as const };
  });
  return changed ? { ...state, slots } : state;
}

/** 役立つ札が立っていれば、その時刻を覚える */
function refreshUseful(state: LaneState, t: number, ctx: LaneContext): LaneState {
  const shown = standingCards(state).some((c) => ctx.useful.has(c.cardId));
  return shown ? { ...state, lastUsefulAt: t } : state;
}

/** スロット i の札を入れ替える（いま乗っている札は山札に戻る） */
function placeCard(state: LaneState, i: number, t: number, ctx: LaneContext): LaneState {
  const cardId = pickCard(state, i, t, ctx);
  const slots = replaceAt(state.slots, i, { cardId, down: null, lap: slotLap(i, t, ctx.geo, ctx.speed) });
  const lastShown = cardId ? { ...state.lastShown, [cardId]: t } : state.lastShown;
  return { ...state, slots, lastShown };
}

/**
 * スロット i に置く札を選ぶ。
 * 候補：当てていない・ほかのスロットに乗っていない・いまの数で出してよい札。
 * 救済の時間を過ぎていれば役立つ札を優先し、そうでなければいちばん長く出ていない札。
 * 同じくらい出ていない札が複数あれば乱数で選ぶ。
 */
export function pickCard(state: LaneState, i: number, t: number, ctx: LaneContext): string | null {
  const onLane = new Set(state.slots.filter((s, j) => j !== i && s.cardId).map((s) => s.cardId));
  const candidates = ctx.problem.targets.filter(
    (c) => !ctx.usedIds.includes(c.id) && !onLane.has(c.id) && canShow(c, ctx.current),
  );
  if (candidates.length === 0) return null;
  const assistDue = ctx.assistSec > 0 && t - state.lastUsefulAt >= ctx.assistSec;
  const useful = candidates.filter((c) => ctx.useful.has(c.id));
  const pool = assistDue && useful.length > 0 ? useful : candidates;
  const shownAt = (id: string) => state.lastShown[id] ?? -Infinity;
  const oldest = Math.min(...pool.map((c) => shownAt(c.id)));
  const ties = pool.filter((c) => shownAt(c.id) === oldest);
  return ties[Math.floor(ctx.rng() * ties.length)].id;
}

function findTarget(problem: Problem, id: string): Target | undefined {
  return problem.targets.find((t) => t.id === id);
}

function replaceAt<T>(list: ReadonlyArray<T>, i: number, value: T): T[] {
  const copy = [...list];
  copy[i] = value;
  return copy;
}
