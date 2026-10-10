import { describe, expect, it } from 'vitest';
import { createRng } from './generator';
import { FIELD_W, UNIFORM_RADIUS } from './hit';
import {
  canShow,
  createLane,
  laneGeometry,
  markHit,
  slotLap,
  slotX,
  standingCards,
  stepLane,
  usefulCards,
  type LaneContext,
  type LaneState,
} from './lane';
import type { Problem } from './types';

/** lane-2 と同じ形（足し算5枚・−5・×2） */
const problem: Problem = {
  id: 'lane-x',
  set: 'lane',
  stage: 2,
  goal: 55,
  shots: 3,
  targets: [
    { id: 'p15', op: '+', value: 15 },
    { id: 'x2', op: '*', value: 2 },
    { id: 'p10', op: '+', value: 10 },
    { id: 'p5', op: '+', value: 5 },
    { id: 'p25', op: '+', value: 25 },
    { id: 'p30', op: '+', value: 30 },
    { id: 'm5', op: '-', value: 5 },
  ],
};

const SPEED = 100;

function ctxOf(over: Partial<LaneContext> = {}): LaneContext {
  return {
    problem,
    geo: laneGeometry(4),
    speed: SPEED,
    current: 0,
    usedIds: [],
    useful: new Set(),
    assistSec: 0,
    rng: createRng(1),
    ...over,
  };
}

/** dt 刻みで t まで進める */
function run(state: LaneState, from: number, to: number, ctx: LaneContext, dt = 1 / 30): LaneState {
  let s = state;
  for (let t = from + dt; t <= to + 1e-9; t += dt) s = stepLane(s, t, ctx);
  return s;
}

function cardsOf(state: LaneState): string[] {
  return state.slots.map((s) => s.cardId).filter((id): id is string => id !== null);
}

describe('laneGeometry / slotX', () => {
  it('スロットは画面に出る数 + 1、1周は画面の幅 + 間隔1つ', () => {
    const geo = laneGeometry(4);
    expect(geo.slots).toBe(5);
    expect(geo.spacing).toBe(FIELD_W / 4);
    expect(geo.loop).toBe(FIELD_W + geo.spacing);
  });

  it('画面に出る数は 3〜6 に収める', () => {
    expect(laneGeometry(1).slots).toBe(4);
    expect(laneGeometry(10).slots).toBe(7);
  });

  it('いちばん多く出しても、1周して戻る瞬間は的が画面の外にいる', () => {
    const geo = laneGeometry(6);
    expect(geo.spacing / 2).toBeGreaterThan(UNIFORM_RADIUS);
  });

  it('左から右へ流れ、1周すると左の画面外に戻って周回数が増える', () => {
    const geo = laneGeometry(4);
    const x0 = slotX(0, 0, geo, SPEED);
    expect(x0).toBeCloseTo(-geo.spacing / 2);
    expect(slotX(0, 1, geo, SPEED)).toBeCloseTo(x0 + SPEED);
    const lapTime = geo.loop / SPEED;
    expect(slotLap(0, lapTime - 0.01, geo, SPEED)).toBe(0);
    expect(slotLap(0, lapTime + 0.01, geo, SPEED)).toBe(1);
    expect(slotX(0, lapTime + 0.01, geo, SPEED)).toBeLessThan(0);
  });

  it('速さ 0 なら止まっている', () => {
    const geo = laneGeometry(4);
    expect(slotX(2, 5, geo, 0)).toBe(slotX(2, 0, geo, 0));
  });
});

describe('canShow（マイナスにしない）', () => {
  it('「−〇」は 〇 がいまの数以下のときだけ', () => {
    expect(canShow({ id: 'a', op: '-', value: 5 }, 4)).toBe(false);
    expect(canShow({ id: 'a', op: '-', value: 5 }, 5)).toBe(true);
  });
  it('0 のときの ×2 は出さない', () => {
    expect(canShow({ id: 'a', op: '*', value: 2 }, 0)).toBe(false);
    expect(canShow({ id: 'a', op: '*', value: 2 }, 10)).toBe(true);
  });
  it('足し算はいつでも出す', () => {
    expect(canShow({ id: 'a', op: '+', value: 30 }, 0)).toBe(true);
  });
});

describe('createLane', () => {
  it('同じ札は2枚出さず、0 のときは −5 と ×2 を出さない', () => {
    const lane = createLane(ctxOf());
    const cards = cardsOf(lane);
    expect(new Set(cards).size).toBe(cards.length);
    expect(cards).not.toContain('m5');
    expect(cards).not.toContain('x2');
    // 足し算は5枚なので、5つのスロットにちょうど1枚ずつ乗る
    expect(cards.sort()).toEqual(['p10', 'p15', 'p25', 'p30', 'p5']);
  });

  it('出せる札がスロットより少なければ、空のスロットができる', () => {
    const lane = createLane(ctxOf({ usedIds: ['p15', 'p10'] }));
    expect(cardsOf(lane)).toHaveLength(3);
    expect(lane.slots.filter((s) => s.cardId === null)).toHaveLength(2);
  });
});

describe('stepLane', () => {
  it('当てた札は倒れたまま流れ、1周したら二度と出てこない', () => {
    const ctx = ctxOf({ current: 15, usedIds: ['p15'] });
    let lane = createLane(ctxOf());
    lane = markHit(lane, 'p15');
    const slot = lane.slots.findIndex((s) => s.cardId === 'p15');
    expect(lane.slots[slot].down).toBe('hit');
    expect(standingCards(lane).map((c) => c.cardId)).not.toContain('p15');
    const lapTime = ctx.geo.loop / SPEED;
    for (let t = 0; t < lapTime * 5; t += 1 / 30) {
      lane = stepLane(lane, t, ctx);
      if (slotLap(slot, t, ctx.geo, SPEED) >= 1) expect(cardsOf(lane)).not.toContain('p15');
    }
  });

  it('当てずに流れていった札も、何周かのうちに必ずまた出てくる', () => {
    const ctx = ctxOf({ current: 10 });
    let lane = createLane(ctx);
    const seen = new Set(cardsOf(lane));
    const lapTime = ctx.geo.loop / SPEED;
    let t = 0;
    for (let lap = 0; lap < 3; lap++) {
      lane = run(lane, t, t + lapTime, ctx);
      t += lapTime;
      cardsOf(lane).forEach((c) => seen.add(c));
    }
    // いまの数 10 なら全部の札が出せる
    expect([...seen].sort()).toEqual(problem.targets.map((c) => c.id).sort());
  });

  it('札が入れ替わるのは、スロットが1周して画面外にいるときだけ', () => {
    const ctx = ctxOf({ current: 10 });
    let lane = createLane(ctx);
    for (let t = 1 / 30; t < 30; t += 1 / 30) {
      const before = lane.slots.map((s) => s.cardId);
      lane = stepLane(lane, t, ctx);
      lane.slots.forEach((s, i) => {
        if (s.cardId !== before[i]) {
          const x = slotX(i, t, ctx.geo, SPEED);
          expect(x).toBeLessThan(-UNIFORM_RADIUS);
        }
      });
    }
  });

  it('いまの数が変わって引けなくなった札は、その場で倒す（札は変えない）', () => {
    const lane: LaneState = {
      slots: [
        { cardId: 'm5', down: null, lap: 0 },
        { cardId: 'p10', down: null, lap: 0 },
      ],
      lastShown: {},
      lastUsefulAt: 0,
    };
    // いまの数が 10 → 3 になった
    const next = stepLane(lane, 0.01, ctxOf({ geo: { ...laneGeometry(4), slots: 2 }, current: 3 }));
    expect(next.slots[0]).toMatchObject({ cardId: 'm5', down: 'invalid' });
    expect(next.slots[1]).toMatchObject({ cardId: 'p10', down: null });
  });

  it('引けなくなって倒した札は山札に戻り、また出せるようになれば出てくる', () => {
    const geo = laneGeometry(3);
    let lane = createLane(ctxOf({ geo, current: 10 }));
    const hadM5 = cardsOf(lane).includes('m5');
    lane = stepLane(lane, 0.01, ctxOf({ geo, current: 3 }));
    if (hadM5) expect(lane.slots.find((s) => s.cardId === 'm5')?.down).toBe('invalid');
    // いまの数が 20 に戻れば、−5 もまた流れてくる
    const ctx = ctxOf({ geo, current: 20, usedIds: [] });
    lane = run(lane, 0.01, (geo.loop / SPEED) * 4, ctx);
    const everSeen = Object.keys(lane.lastShown);
    expect(everSeen).toContain('m5');
  });
});

describe('救済', () => {
  /** 役立つ札が1枚（p30）しかない状況：レーンに乗っていない状態から始める */
  function setup(assistSec: number) {
    const geo = laneGeometry(3);
    const ctx = ctxOf({ geo, current: 10, useful: new Set(['p30']), assistSec });
    const lane: LaneState = {
      slots: [
        { cardId: 'p5', down: null, lap: 0 },
        { cardId: 'p10', down: null, lap: 0 },
        { cardId: 'p15', down: null, lap: 0 },
        { cardId: 'p25', down: null, lap: 0 },
      ],
      // p30 は最近出たばかり。救済がなければ後回しになる
      lastShown: { p5: -10, p10: -10, p15: -10, p25: -10, x2: -20, m5: -20, p30: 0 },
      lastUsefulAt: 0,
    };
    return { ctx, lane };
  }

  /** p30 が最初にレーンに置かれた時刻 */
  function firstShown(assistSec: number): number {
    const { ctx, lane: start } = setup(assistSec);
    let lane = start;
    for (let t = 1 / 30; t < 60; t += 1 / 30) {
      lane = stepLane(lane, t, ctx);
      if (cardsOf(lane).includes('p30')) return t;
    }
    return Infinity;
  }

  it('役立つ札が決めた秒数出ていなければ、次に入れ替わるスロットにそれを置く', () => {
    const { ctx } = setup(3);
    const withAssist = firstShown(3);
    // 3秒たってから、次にスロットが1周するまでのあいだに出る
    expect(withAssist).toBeGreaterThanOrEqual(3);
    expect(withAssist).toBeLessThanOrEqual(3 + ctx.geo.spacing / SPEED + 0.05);
  });

  it('救済なし（0 秒）なら、いちばん長く出ていない札が先になる', () => {
    expect(firstShown(0)).toBeGreaterThan(firstShown(3));
  });
});

describe('usefulCards', () => {
  it('マイナスを通らずに目標まで届く撃ち方の、1発目になる札', () => {
    const p: Problem = {
      id: 'u',
      set: 'lane',
      stage: 2,
      goal: 30,
      shots: 2,
      targets: [
        { id: 'p10', op: '+', value: 10 },
        { id: 'p20', op: '+', value: 20 },
        { id: 'x2', op: '*', value: 2 },
        { id: 'm5', op: '-', value: 5 },
        { id: 'p35', op: '+', value: 35 },
      ],
    };
    // 0 から：10+20, 20+10, 35−5。−5 から始める道（0−5+35）はマイナスを通るので入れない
    expect([...usefulCards(p, 0, [], 2)].sort()).toEqual(['p10', 'p20', 'p35']);
    // 15 から1発（×2 は使用済み）：届く札はない
    expect(usefulCards(p, 15, ['x2'], 1).size).toBe(0);
    // 15 から2発：15×2 で届く
    expect([...usefulCards(p, 15, [], 2)]).toContain('x2');
  });
});
