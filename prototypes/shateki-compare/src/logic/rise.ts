import { canShow, laterFactor } from './lane';
import type { Calc } from './ops';
import type { Problem } from './types';

/**
 * E「おきあがる」の的の置き場所の計算。描画には依存しない。
 *
 * 置き場所（スロット）は1段に並び、動かない。立っている的は決まった数だけで、残りは空き。
 * 札が変わるのは、的に当てたときと「いれかえる」を押したときだけ（時間では変わらない。
 * 考えている途中で札が変わって、見えない制限時間にならないように）。
 * - 当てた的は倒れ、少したつと、空いている**別の場所**に新しい札の的が起き上がる
 * - いれかえる：一番長く立っている的が静かに倒れ、空いている別の場所に新しい札の的が起き上がる
 * 起き上がる札は、出してよい札の中からランダムに選ぶ（役立つ札を優先しない。答えに誘導しない）。
 */

/** 起き上がる演出の長さ（秒）。起き上がりきるまでは当たらない */
export const RISE_SEC = 0.35;

/** 倒れた理由（演出を分けるため）。hit = 当てた（C と同じ倒れ方）、swap = いれかえで静かに倒れた */
export type FallReason = 'hit' | 'swap';

export interface RiseSlot {
  /** 乗っている札の id。null = 空き（または起き上がる順番待ち） */
  cardId: string | null;
  /** 起き上がりはじめる時刻（秒）。予約中ならこの時刻に札を選んで起き上がる */
  appearAt: number;
  /** 倒れていればその理由。倒れた札は描画のために残すが、置き場所としては空きと同じ */
  fell: FallReason | null;
  /** 起き上がる順番待ち（appearAt になったら札を選ぶ） */
  reserved: boolean;
  /** 順番待ちのとき、選ばないようにする札（いれかえで倒れたばかりの札。同じ札がすぐ起き上がらないように） */
  avoidId: string | null;
}

export interface RiseState {
  slots: RiseSlot[];
}

export interface RiseContext {
  problem: Problem;
  /** 計算の途中の状態（出してよい札を決めるのに使う） */
  calc: Calc;
  usedIds: ReadonlyArray<string>;
  rng: () => number;
}

/** 立っている（起き上がる途中も含む）か */
export function isStanding(s: RiseSlot): boolean {
  return s.cardId !== null && s.fell === null && !s.reserved;
}

/** 時刻 t に当てられるか（起き上がりきっているか） */
export function isHittable(s: RiseSlot, t: number): boolean {
  return isStanding(s) && t >= s.appearAt + RISE_SEC;
}

/** 新しい的を置いてよい場所か（空き・倒れている。予約中は除く） */
function isFree(s: RiseSlot): boolean {
  return !s.reserved && (s.cardId === null || s.fell !== null);
}

/**
 * ゲーム開始時の置き場所。positions か所のうち、ランダムな standing か所に、ランダムな札を立てる。
 * やり直すたびに組み合わせが変わる。最初から立っているので、起き上がる途中にはしない。
 */
export function createRise(ctx: RiseContext, positions: number, standing: number): RiseState {
  let slots: RiseSlot[] = Array.from({ length: positions }, () => ({
    cardId: null,
    appearAt: -RISE_SEC,
    fell: null,
    reserved: false,
    avoidId: null,
  }));
  const order = shuffle(ctx.rng, slots.map((_, i) => i));
  for (const i of order.slice(0, standing)) {
    const cardId = pickCard(slots, ctx, null);
    if (cardId) slots = replaceAt(slots, i, { ...slots[i], cardId });
  }
  return { slots };
}

/**
 * 的に当てた。その的は倒れ（C と同じ倒れ方）、delay 秒後に、空いている別の場所に新しい札が起き上がる。
 * 起き上がる札は、その時刻の計算の状態で選ぶ（stepRise）。
 */
export function hitRise(state: RiseState, cardId: string, t: number, delay: number, rng: () => number): RiseState {
  const i = state.slots.findIndex((s) => s.cardId === cardId && isStanding(s));
  if (i < 0) return state;
  return reserveRise(fall(state, i, 'hit'), i, t + delay, null, rng);
}

/**
 * いれかえる。一番長く立っている的が静かに倒れ、delay 秒後に、空いている別の場所に新しい札が起き上がる。
 * 弾は減らない。立っている的がなければ何もしない。
 */
export function swapRise(state: RiseState, t: number, delay: number, rng: () => number): RiseState {
  const standing = state.slots.map((s, i) => ({ s, i })).filter(({ s }) => isHittable(s, t));
  if (standing.length === 0) return state;
  const oldest = standing.reduce((a, b) => (b.s.appearAt < a.s.appearAt ? b : a));
  return reserveRise(fall(state, oldest.i, 'swap'), oldest.i, t + delay, oldest.s.cardId, rng);
}

/** 時刻 t まで進める。起き上がる時刻になった予約に、札を選んで置く（出せる札がなければ空きのまま） */
export function stepRise(state: RiseState, t: number, ctx: RiseContext): RiseState {
  let slots = state.slots;
  slots.forEach((s, i) => {
    if (!s.reserved || t < s.appearAt) return;
    const cardId = pickCard(slots, ctx, s.avoidId);
    slots = replaceAt(slots, i, { cardId, appearAt: s.appearAt, fell: null, reserved: false, avoidId: null });
  });
  return slots === state.slots ? state : { slots };
}

/**
 * 起き上がる札を選ぶ。候補：当てていない・今立っていない（起き上がる途中も含む）・いまの計算の状態で出してよい札。
 * avoidId（いれかえで倒れたばかりの札）は、ほかに候補がないときだけ選ぶ（同じ札がすぐ起き上がらないように）。
 * 候補の中からランダムに選ぶ（役立つ札を優先しない）。
 */
export function pickCard(slots: ReadonlyArray<RiseSlot>, ctx: RiseContext, avoidId: string | null = null): string | null {
  const standing = new Set(slots.filter(isStanding).map((s) => s.cardId));
  const candidates = ctx.problem.targets.filter(
    (c) =>
      !ctx.usedIds.includes(c.id) &&
      !standing.has(c.id) &&
      canShow(c, ctx.calc, laterFactor(ctx.problem, ctx.usedIds, c.id)),
  );
  const fresh = candidates.filter((c) => c.id !== avoidId);
  const pool = fresh.length > 0 ? fresh : candidates;
  if (pool.length === 0) return null;
  return pool[Math.floor(ctx.rng() * pool.length)].id;
}

function fall(state: RiseState, i: number, reason: FallReason): RiseState {
  return { slots: replaceAt(state.slots, i, { ...state.slots[i], fell: reason }) };
}

/**
 * 空いている場所を1つ予約する。今倒れたばかりの場所（justFell）は、ほかに空きがないときだけ使う。
 * avoidId は、起き上がるときに選ばないようにする札。
 */
function reserveRise(
  state: RiseState,
  justFell: number,
  appearAt: number,
  avoidId: string | null,
  rng: () => number,
): RiseState {
  const free = state.slots.map((s, i) => ({ s, i })).filter(({ s, i }) => isFree(s) && i !== justFell);
  const i = free.length > 0 ? free[Math.floor(rng() * free.length)].i : justFell;
  const target = state.slots[i];
  return {
    slots: replaceAt(state.slots, i, { cardId: target.cardId, appearAt, fell: target.fell, reserved: true, avoidId }),
  };
}

function shuffle<T>(rng: () => number, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function replaceAt<T>(list: ReadonlyArray<T>, i: number, value: T): T[] {
  const copy = [...list];
  copy[i] = value;
  return copy;
}
