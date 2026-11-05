import { describe, expect, it } from 'vitest';
import { exportLog, LOG_SCHEMA_VERSION, makeEvent } from './log';

const now = new Date('2026-11-01T00:00:00Z');

describe('makeEvent', () => {
  it('遊びのイベントに、時刻・起動の id・通し番号・人・バリエーション・問題が入る', () => {
    const e = makeEvent(
      { sessionId: 's1', seq: 3 },
      { playerId: 'p1', variant: 'B', shooter: 'gun', stage: 2, problemId: 'std-2-1', attemptId: 'abc', type: 'restart', current: 10, shotsLeft: 1 },
      now,
    );
    expect(e).toMatchObject({
      t: '2026-11-01T00:00:00.000Z',
      sessionId: 's1',
      seq: 3,
      playerId: 'p1',
      variant: 'B',
      stage: 2,
      problemId: 'std-2-1',
      type: 'restart',
    });
  });

  it('遊びの外のイベント（起動・人の切り替え）は、問題の項目なしで残せる', () => {
    const e = makeEvent({ sessionId: 's1', seq: 1 }, { playerId: 'p1', type: 'player_start', reason: 'next_player' }, now);
    expect(e).toEqual({ t: '2026-11-01T00:00:00.000Z', sessionId: 's1', seq: 1, playerId: 'p1', type: 'player_start', reason: 'next_player' });
  });
});

describe('exportLog', () => {
  it('版・パソコンの id・件数とイベントを入れる', () => {
    const e = makeEvent({ sessionId: 's1', seq: 1 }, { playerId: 'p1', type: 'player_start', reason: 'first' }, now);
    const out = JSON.parse(exportLog([e], { deviceId: 'd1' }, now));
    expect(out).toMatchObject({ schemaVersion: LOG_SCHEMA_VERSION, deviceId: 'd1', count: 1, exportedAt: '2026-11-01T00:00:00.000Z' });
    expect(out.events).toHaveLength(1);
  });
});
