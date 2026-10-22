import { FIELD_W } from './hit';
import { START, step, valueOf, type Calc } from './ops';
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
 * まだ当てていない掛け算の札を全部かけたときの倍率（×2 が1枚残っていれば 2）。exceptId の札は数えない。
 * ÷ は数を小さくするだけなので数えない。
 */
export function laterFactor(problem: Problem, usedIds: ReadonlyArray<string>, exceptId?: string): number {
  return problem.targets
    .filter((t) => t.op === '*' && t.value > 1 && t.id !== exceptId && !usedIds.includes(t.id))
    .reduce((f, t) => f * t.value, 1);
}

/**
 * いまの計算の状態で、この札をレーンに出してよいか（計算の途中でマイナスにしないため）。
 * - 「−〇」は、まだ当てていない掛け算の札を全部その項にかけても（factor 倍）マイナスにならないときだけ。
 *   × は最後の項にかかるので、10 − 10 のあとに見えていた ×2 を当てると 10 − 20 になる。
 *   D は見えている札を倒さないので、出す時点でこれを防ぐ
 * - × ÷ は、当ててもマイナスにならず、数が変わるときだけ（まだ項がないときの ×2 は何も変えない）
 */
export function canShow(target: Target, calc: Calc, factor = 1): boolean {
  if (target.op === '+') return true;
  if (target.op === '-') return valueOf(calc) - target.value * factor >= 0;
  const next = valueOf(step(calc, target.op, target.value));
  return next >= 0 && next !== valueOf(calc);
}

/**
 * D の流し方で、start から moves の順に撃てるか。
 * それぞれの札が、当てる直前の状態で「出してよい札」になっていれば撃てる
 * （出してよい札なら、その状態で待っていればいつか流れてくる）。
 */
export function playableInLane(
  problem: Problem,
  moves: ReadonlyArray<Target>,
  start: Calc = START,
  usedIds: ReadonlyArray<string> = [],
): boolean {
  let calc = start;
  const used = [...usedIds];
  for (const t of moves) {
    if (!canShow(t, calc, laterFactor(problem, used, t.id))) return false;
    calc = step(calc, t.op, t.value);
    used.push(t.id);
  }
  return true;
}

/**
 * 届くために役立つ札：いまの状態から、D の流し方で目標まで届く撃ち方の、1発目になる札。
 * 救済（役立つ札がしばらく出ていなければ流す）に使う。
 */
export function usefulCards(
  problem: Problem,
  calc: Calc,
  usedIds: ReadonlyArray<string>,
  shotsLeft: number,
): Set<string> {
  const ids = new Set<string>();
  for (const s of enumerateSolutions(problem, calc, usedIds, shotsLeft)) {
    if (playableInLane(problem, s.targets, calc, usedIds)) ids.add(s.targets[0].id);
  }
  return ids;
}

export interface LaneSlot {
  /** 乗っている札の id（出せる札がなければ null = 空のスロット） */
  cardId: string | null;
  /** 当てて倒れているか（倒れたまま画面外まで流れる） */
  down: boolean;
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
  /** 計算の途中の状態（出してよい札を決めるのに使う） */
  calc: Calc;
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
    state = { ...state, slots: [...state.slots, { cardId: null, down: false, lap: slotLap(i, t, ctx.geo, ctx.speed) }] };
    state = placeCard(state, i, t, ctx);
  }
  return refreshUseful(state, t, ctx);
}

/**
 * 時刻 t までレーンを進める。毎フレーム呼ぶ。
 * 1周して左の画面外に戻ったスロットには、新しい札を置く。
 * いまの数が変わっても、見えている札は倒さない（当てていない的がいきなり倒れると、わけがわからないため）。
 * 引き算の札は1問に1枚までで、「−〇」は残りの掛け算を全部かけてもマイナスにならないときだけ出すので、
 * 見えている札をあとから当ててもマイナスにならない。
 */
export function stepLane(state: LaneState, t: number, ctx: LaneContext): LaneState {
  let next = state;
  for (let i = 0; i < next.slots.length; i++) {
    if (slotLap(i, t, ctx.geo, ctx.speed) > next.slots[i].lap) next = placeCard(next, i, t, ctx);
  }
  return refreshUseful(next, t, ctx);
}

/** 当てた札のスロットを倒す（倒れたまま画面外まで流れる） */
export function markHit(state: LaneState, cardId: string): LaneState {
  const i = state.slots.findIndex((s) => s.cardId === cardId && !s.down);
  if (i < 0) return state;
  return { ...state, slots: replaceAt(state.slots, i, { ...state.slots[i], down: true }) };
}

/** 立っている（当てられる）札の id とスロット番号 */
export function standingCards(state: LaneState): Array<{ slot: number; cardId: string }> {
  const list: Array<{ slot: number; cardId: string }> = [];
  state.slots.forEach((s, slot) => {
    if (s.cardId && !s.down) list.push({ slot, cardId: s.cardId });
  });
  return list;
}

/** 役立つ札が立っていれば、その時刻を覚える */
function refreshUseful(state: LaneState, t: number, ctx: LaneContext): LaneState {
  const shown = standingCards(state).some((c) => ctx.useful.has(c.cardId));
  return shown ? { ...state, lastUsefulAt: t } : state;
}

/** スロット i の札を入れ替える（いま乗っている札は山札に戻る） */
function placeCard(state: LaneState, i: number, t: number, ctx: LaneContext): LaneState {
  const cardId = pickCard(state, i, t, ctx);
  const slots = replaceAt(state.slots, i, { cardId, down: false, lap: slotLap(i, t, ctx.geo, ctx.speed) });
  const lastShown = cardId ? { ...state.lastShown, [cardId]: t } : state.lastShown;
  return { ...state, slots, lastShown };
}

/**
 * スロット i に置く札を選ぶ。
 * 候補：当てていない・ほかのスロットに乗っていない・いまの計算の状態で出してよい札（canShow）。
 * 救済の時間を過ぎていれば役立つ札を優先し、そうでなければいちばん長く出ていない札。
 * 同じくらい出ていない札が複数あれば乱数で選ぶ。
 */
export function pickCard(state: LaneState, i: number, t: number, ctx: LaneContext): string | null {
  const onLane = new Set(state.slots.filter((s, j) => j !== i && s.cardId).map((s) => s.cardId));
  const candidates = ctx.problem.targets.filter(
    (c) =>
      !ctx.usedIds.includes(c.id) &&
      !onLane.has(c.id) &&
      canShow(c, ctx.calc, laterFactor(ctx.problem, ctx.usedIds, c.id)),
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

function replaceAt<T>(list: ReadonlyArray<T>, i: number, value: T): T[] {
  const copy = [...list];
  copy[i] = value;
  return copy;
}
