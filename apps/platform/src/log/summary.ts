import type { LogEvent } from './logStore'

export interface LogSummary {
  total: number
  /** 何回のあそび（セッション）か */
  sessions: number
  /** 「ゲーム / イベント種類」ごとの件数（多い順） */
  byKind: Array<{ kind: string; count: number }>
}

export function summarizeLog(events: ReadonlyArray<LogEvent>): LogSummary {
  const counts = new Map<string, number>()
  const sessions = new Set<string>()

  for (const e of events) {
    sessions.add(e.sessionId)
    const kind = `${e.game} / ${e.type}`
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }

  const byKind = [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind))

  return { total: events.length, sessions: sessions.size, byKind }
}
