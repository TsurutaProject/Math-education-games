import { describe, expect, it } from 'vitest';
import { summarizeAttempts } from './attempts';
import { makeEvent, type LogBody, type LogEvent } from './log';

/** 1つの起動のイベントを順に作る */
function session(bodies: LogBody[]): LogEvent[] {
  return bodies.map((b, i) => makeEvent({ sessionId: 's1', seq: i + 1 }, b, new Date(Date.UTC(2026, 10, 7, 0, 0, i))));
}

const game = (attemptId: string, problemId = 'std-1-1') => ({
  playerId: 'p1',
  variant: 'B' as const,
  shooter: 'gun' as const,
  stage: 1,
  problemId,
  attemptId,
});

const shot = (attemptId: string, sinceStartMs: number, hit: string | null) => ({
  ...game(attemptId),
  type: 'shot' as const,
  aim: { x: 0.5, y: 0.5 },
  hitTargetId: hit,
  hitLabel: hit,
  assist: 1,
  shotsLeftBefore: 3,
  pointerType: 'mouse',
  sinceStartMs,
  aimMs: 300,
  reachableAfter: true,
});

const hit = (attemptId: string, value: number, before: number) => ({
  ...game(attemptId),
  type: 'value_change' as const,
  op: '+' as const,
  value,
  before,
  after: before + value,
  shotsLeft: 2,
  reachable: true,
});

const start = (attemptId: string, reason: 'first' | 'retry', attemptNo: number, problemId?: string) => ({
  ...game(attemptId, problemId),
  type: 'problem_start' as const,
  reason,
  attemptNo,
  foundBefore: 0,
  mapNo: '2-1',
});

describe('summarizeAttempts（挑戦ごとのまとめ）', () => {
  const events = session([
    { playerId: 'p1', type: 'player_start', reason: 'first' },
    // 1回目：1発当てて「さいしょから」
    start('a1', 'first', 1),
    shot('a1', 1200, '+10'),
    hit('a1', 10, 0),
    { ...game('a1'), type: 'restart', current: 10, shotsLeft: 2, expression: '10', elapsedMs: 3000 },
    // 2回目：2発当ててクリア（途中で画面が隠れた）
    start('a2', 'retry', 2),
    shot('a2', 800, '+10'),
    hit('a2', 10, 0),
    { ...game('a2'), type: 'page_hide', current: 10, shotsLeft: 2 },
    shot('a2', 5000, '+30'),
    hit('a2', 30, 10),
    { ...game('a2'), type: 'clear', key: '+10,+30', expression: '10 + 30', isNew: true, shotsLeft: 1, foundCount: 1, totalCount: 3, elapsedMs: 5100 },
    // 3回目：別の問題を始めたところで終わり（記録がない）
    start('a3', 'first', 1, 'std-1-2'),
  ]);
  const rows = summarizeAttempts(events, { deviceId: 'd1', goalOf: (id) => (id === 'std-1-1' ? 40 : null) });

  it('挑戦ごとに1行（人の切り替えなど、遊びの外のイベントは入れない）', () => {
    expect(rows.map((r) => r.attemptId)).toEqual(['a1', 'a2', 'a3']);
  });

  it('さいしょから：結果・式・経過時間・1発目までの時間', () => {
    expect(rows[0]).toMatchObject({
      deviceId: 'd1',
      sessionId: 's1',
      playerId: 'p1',
      problemId: 'std-1-1',
      goal: 40,
      startReason: 'first',
      attemptNo: 1,
      mapNo: '2-1',
      result: 'restart',
      expression: '10',
      key: null,
      shots: 1,
      hits: 1,
      firstShotMs: 1200,
      elapsedMs: 3000,
    });
  });

  it('クリア：解き方のキー・新発見か・画面が隠れた回数', () => {
    expect(rows[1]).toMatchObject({
      startReason: 'retry',
      attemptNo: 2,
      result: 'clear',
      expression: '10 + 30',
      key: '+10,+30',
      isNew: true,
      shots: 2,
      hits: 2,
      firstShotMs: 800,
      elapsedMs: 5100,
      pageHides: 1,
    });
  });

  it('終わりの記録がない挑戦は unfinished（目標がわからなければ null）', () => {
    expect(rows[2]).toMatchObject({ result: 'unfinished', expression: '0', shots: 0, firstShotMs: null, elapsedMs: null, goal: null });
  });

  it('版 1 のログ（起動の id がない）もまとめられる', () => {
    const old = [{ t: '2026-10-01T00:00:00.000Z', ...game('o1'), type: 'out_of_shots', current: 20, goal: 40, diff: 20 }];
    const [row] = summarizeAttempts(old as unknown as LogEvent[], { deviceId: 'd1' });
    expect(row).toMatchObject({ sessionId: null, attemptId: 'o1', result: 'out', key: null, elapsedMs: null });
  });
});
