import { describe, expect, it } from 'vitest';
import { exportLog, makeEvent } from './log';
import { foundEntries, recordSolution, zukanId, type Zukan } from './zukan';

describe('zukan', () => {
  it('はじめての解き方は新発見、同じキーは新発見でない', () => {
    const z: Zukan = new Map();
    const id = zukanId('A', 'p1');
    expect(recordSolution(z, id, { key: 'k1', expression: '10 + 30' })).toBe(true);
    expect(recordSolution(z, id, { key: 'k1', expression: '30 + 10' })).toBe(false);
    expect(recordSolution(z, id, { key: 'k2', expression: '20 + 20' })).toBe(true);
    // 式は最初に見つけたときのものを残す
    expect(foundEntries(z, id).map((e) => e.expression)).toEqual(['10 + 30', '20 + 20']);
  });

  it('バリエーションごとに別の図鑑', () => {
    const z: Zukan = new Map();
    recordSolution(z, zukanId('A', 'p1'), { key: 'k1', expression: '' });
    expect(foundEntries(z, zukanId('B', 'p1'))).toEqual([]);
  });
});

describe('log', () => {
  it('イベントにバリエーション・ステージ・問題 id と時刻が入る', () => {
    const e = makeEvent(
      { variant: 'B', stage: 2, problemId: 'std-2-1', attemptId: 'abc' },
      { type: 'restart', current: 10, shotsLeft: 1 },
      new Date('2026-11-01T00:00:00Z'),
    );
    expect(e).toMatchObject({ t: '2026-11-01T00:00:00.000Z', variant: 'B', stage: 2, problemId: 'std-2-1', type: 'restart' });
    expect(JSON.parse(exportLog([e])).events).toHaveLength(1);
  });
});
