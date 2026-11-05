import { describe, expect, it } from 'vitest';
import { createRng } from './generator';
import { FIELD_W } from './hit';
import { START, step, type Calc } from './ops';
import {
  createRise,
  hitRise,
  isHittable,
  isStanding,
  pickCard,
  RISE_POSITIONS,
  RISE_SEC,
  riseSlotPlace,
  stepRise,
  swapRise,
  type RiseContext,
  type RiseState,
} from './rise';
import type { Problem } from './types';

/** rise-2 と同じ形（足し算6枚・−5・×2） */
const problem: Problem = {
  id: 'rise-x',
  set: 'rise',
  stage: 2,
  goal: 70,
  shots: 3,
  targets: [
    { id: 'p35', op: '+', value: 35 },
    { id: 'p5', op: '+', value: 5 },
    { id: 'p15', op: '+', value: 15 },
    { id: 'x2', op: '*', value: 2 },
    { id: 'p25', op: '+', value: 25 },
    { id: 'm5', op: '-', value: 5 },
    { id: 'p20', op: '+', value: 20 },
    { id: 'p40', op: '+', value: 40 },
  ],
};

const DELAY = 1;
const at = (n: number): Calc => (n === 0 ? START : step(START, '+', n));

function ctxOf(over: Partial<RiseContext> = {}): RiseContext {
  return { problem, calc: START, usedIds: [], rng: createRng(1), ...over };
}

const standingCards = (s: RiseState) => s.slots.filter(isStanding).map((x) => x.cardId!);

describe('riseSlotPlace（置き場所の位置）', () => {
  it('1段に等間隔に並び、となりの的と重ならず、フィールドからはみ出さない', () => {
    const places = Array.from({ length: RISE_POSITIONS }, (_, i) => riseSlotPlace(i));
    for (let i = 1; i < places.length; i++) {
      expect(places[i].x - places[i - 1].x).toBeGreaterThan(places[i].r + places[i - 1].r);
    }
    expect(places[0].x - places[0].r).toBeGreaterThanOrEqual(0);
    expect(places.at(-1)!.x + places.at(-1)!.r).toBeLessThanOrEqual(FIELD_W);
  });
});

describe('createRise（最初の置き場所）', () => {
  it('8か所のうち6か所に、同じ札が重ならないように立てる', () => {
    const s = createRise(ctxOf(), 8, 6);
    expect(s.slots).toHaveLength(8);
    const cards = standingCards(s);
    expect(cards).toHaveLength(6);
    expect(new Set(cards).size).toBe(6);
  });

  it('0 のときは −5 と ×2 を出さない（足し算6枚がちょうど立つ）', () => {
    const cards = standingCards(createRise(ctxOf(), 8, 6));
    expect(cards.sort()).toEqual(['p15', 'p20', 'p25', 'p35', 'p40', 'p5']);
  });

  it('最初から当てられる（起き上がる途中にしない）', () => {
    const s = createRise(ctxOf(), 8, 6);
    expect(s.slots.filter((x) => isHittable(x, 0))).toHaveLength(6);
  });

  it('やり直すと、立つ場所の組み合わせが変わる', () => {
    const layouts = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        createRise(ctxOf({ rng: createRng(seed) }), 8, 6)
          .slots.map((x) => (isStanding(x) ? 'o' : '.'))
          .join(''),
      ),
    );
    expect(layouts.size).toBeGreaterThan(1);
  });
});

describe('hitRise / stepRise（当てたら、別の場所で起き上がる）', () => {
  it('当てた的は倒れ、少したつと別の空いている場所に新しい札が起き上がる', () => {
    const ctx = ctxOf();
    let s = createRise(ctx, 8, 6);
    const hitSlot = s.slots.findIndex(isStanding);
    const hitCard = s.slots[hitSlot].cardId!;
    s = hitRise(s, hitCard, 5, DELAY, ctx.rng);
    expect(s.slots[hitSlot].fell).toBe('hit');
    const reserved = s.slots.findIndex((x) => x.reserved);
    expect(reserved).toBeGreaterThanOrEqual(0);
    expect(reserved).not.toBe(hitSlot);

    // 当てたあとの状態で札を選ぶ
    const after = ctxOf({ calc: at(35), usedIds: [hitCard], rng: ctx.rng });
    // まだ時刻になっていなければ起き上がらない
    expect(stepRise(s, 5 + DELAY - 0.01, after).slots[reserved].cardId).toBeNull();
    s = stepRise(s, 5 + DELAY, after);
    const risen = s.slots[reserved];
    expect(isStanding(risen)).toBe(true);
    expect(risen.cardId).not.toBe(hitCard);
    expect(standingCards(s)).toHaveLength(6);
    // 起き上がりきるまでは当たらない
    expect(isHittable(risen, 5 + DELAY)).toBe(false);
    expect(isHittable(risen, 5 + DELAY + RISE_SEC)).toBe(true);
  });

  it('当てた札は、その挑戦の中ではもう起き上がらない', () => {
    const rng = createRng(3);
    let s = createRise(ctxOf({ rng }), 8, 6);
    const used: string[] = [];
    let t = 0;
    let calc = START;
    // 足し算の札を順に当てていく
    for (let k = 0; k < 4; k++) {
      const slot = s.slots.find(
        (x) => isHittable(x, t) && problem.targets.find((c) => c.id === x.cardId)!.op === '+',
      );
      if (!slot) break;
      const card = problem.targets.find((c) => c.id === slot.cardId)!;
      used.push(card.id);
      calc = step(calc, card.op, card.value);
      s = hitRise(s, card.id, t, DELAY, rng);
      t += DELAY + RISE_SEC;
      s = stepRise(s, t, ctxOf({ calc, usedIds: used, rng }));
      for (const id of used) expect(standingCards(s)).not.toContain(id);
    }
  });

  it('出せる札がなくなったら、予約した場所は空きのまま', () => {
    const rng = createRng(2);
    let s = createRise(ctxOf({ rng }), 8, 6);
    const card = standingCards(s)[0];
    s = hitRise(s, card, 0, DELAY, rng);
    // 当てていない札が全部「使用済み」なら、出せる札はない
    const allUsed = problem.targets.map((c) => c.id);
    s = stepRise(s, DELAY, ctxOf({ calc: at(100), usedIds: allUsed, rng }));
    expect(s.slots.some((x) => x.reserved)).toBe(false);
    expect(standingCards(s)).toHaveLength(5);
  });

  it('マイナスにならない札だけ起き上がる（×2 が残っていれば、−5 は いまの数 − 5 × 2 がマイナスにならないときだけ）', () => {
    // 残りの札を −5 と ×2 だけにする：10 なら 10 − 5 × 2 = 0 で −5 も出せる。4 なら出せない
    const usedPlus = ['p35', 'p5', 'p15', 'p25', 'p20', 'p40'];
    const empty = { slots: [{ cardId: null, appearAt: 0, fell: null, reserved: false, avoidId: null }] };
    const pick = (n: number) => {
      const seen = new Set<string | null>();
      for (let seed = 1; seed <= 20; seed++) {
        seen.add(pickCard(empty.slots, ctxOf({ calc: at(n), usedIds: usedPlus, rng: createRng(seed) })));
      }
      return seen;
    };
    expect(pick(10)).toEqual(new Set(['m5', 'x2']));
    expect(pick(4)).toEqual(new Set(['x2']));
  });
});

describe('swapRise（いれかえる）', () => {
  it('一番長く立っている的が静かに倒れ、別の場所に新しい札が起き上がる', () => {
    const ctx = ctxOf();
    let s = createRise(ctx, 8, 6);
    // 1つ当てて、新しい的を起き上がらせる（この的は一番新しい）
    const first = s.slots.findIndex(isStanding);
    s = hitRise(s, s.slots[first].cardId!, 0, DELAY, ctx.rng);
    s = stepRise(s, DELAY, ctxOf({ calc: at(35), usedIds: [s.slots[first].cardId!], rng: ctx.rng }));
    const newest = s.slots.findIndex((x) => isStanding(x) && x.appearAt === DELAY);

    const t = 10;
    const swapped = swapRise(s, t, DELAY, ctx.rng);
    const fellSlot = swapped.slots.findIndex((x, i) => x.fell === 'swap' && s.slots[i].fell === null);
    expect(fellSlot).toBeGreaterThanOrEqual(0);
    // 一番新しい的は倒さない
    expect(fellSlot).not.toBe(newest);
    const reserved = swapped.slots.findIndex((x) => x.reserved);
    expect(reserved).not.toBe(fellSlot);
  });

  it('いれかえで倒れた札は、ほかに出せる札があればすぐには起き上がらない', () => {
    const rng = createRng(5);
    const ctx = ctxOf({ calc: at(10), rng });
    let s = createRise(ctx, 8, 6);
    for (let k = 0; k < 10; k++) {
      const t = 10 + k * 3;
      const before = s;
      s = swapRise(s, t, DELAY, rng);
      const fellIndex = s.slots.findIndex((x, i) => x.fell === 'swap' && before.slots[i].fell !== 'swap');
      const fellCard = s.slots[fellIndex]?.cardId;
      s = stepRise(s, t + DELAY, ctx);
      const risen = s.slots.find((x) => isStanding(x) && x.appearAt === t + DELAY);
      if (risen && fellCard) expect(risen.cardId).not.toBe(fellCard);
    }
  });

  it('いれかえで弾は減らない（ゲームの状態は変えない）・立っている的がなければ何もしない', () => {
    const empty: RiseState = { slots: [{ cardId: null, appearAt: 0, fell: null, reserved: false, avoidId: null }] };
    expect(swapRise(empty, 5, DELAY, createRng(1))).toBe(empty);
  });

  it('起き上がる途中の的は、いれかえの対象にしない', () => {
    const ctx = ctxOf();
    let s = createRise(ctx, 8, 6);
    // 立っている的が、起き上がる途中の1つだけの状態をつくる
    s = {
      slots: s.slots.map((x, i) =>
        i === 0
          ? { ...x, cardId: 'p5', fell: null, reserved: false, avoidId: null, appearAt: 9.9 }
          : { ...x, cardId: null, fell: null, reserved: false, avoidId: null },
      ),
    };
    expect(swapRise(s, 10, DELAY, ctx.rng)).toBe(s);
  });
});
