import { describe, expect, it } from 'vitest'
import type { LogEvent } from './logStore'
import { summarizeLog } from './summary'

const ev = (sessionId: string, game: string, type: string): LogEvent => ({
  t: '2026-11-01T00:00:00.000Z',
  sessionId,
  game,
  type,
})

describe('summarizeLog', () => {
  it('空のログは 0 件', () => {
    expect(summarizeLog([])).toEqual({ total: 0, sessions: 0, byKind: [] })
  })

  it('件数・セッション数・種類別の件数を数える（多い順、同数は名前順）', () => {
    const summary = summarizeLog([
      ev('a', 'platform', 'home_view'),
      ev('a', 'platform', 'game_open'),
      ev('b', 'platform', 'home_view'),
      ev('b', 'cake', 'stage_clear'),
      ev('b', 'cake', 'stage_clear'),
      ev('b', 'cake', 'stage_clear'),
    ])

    expect(summary.total).toBe(6)
    expect(summary.sessions).toBe(2)
    expect(summary.byKind).toEqual([
      { kind: 'cake / stage_clear', count: 3 },
      { kind: 'platform / home_view', count: 2 },
      { kind: 'platform / game_open', count: 1 },
    ])
  })
})
