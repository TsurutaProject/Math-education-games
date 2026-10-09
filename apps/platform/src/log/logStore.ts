/**
 * 共通ログ。プラットフォームと各ゲームが「同じ保存先・同じ形」で書き込む。
 *
 * - 保存先は localStorage（バックエンドなし）。同じ URL の配下（/ と /cake/ と /shateki/）なら共有できる。
 * - 個人情報は入れない（名前・自由入力の文字など）。data には短い数値・文字・真偽だけを入れる。
 * - 書き込みのたびに保存先を読み直す。別のページ（ゲーム）が書いたログを上書きして消さないため。
 */

export const LOG_STORAGE_KEY = 'mathgames:log:v1'
export const SESSION_STORAGE_KEY = 'mathgames:session'

/** 保存するログの上限。超えたら古いものから捨てる（容量不足でゲームを止めないため）。 */
export const MAX_EVENTS = 5000

/** プラットフォーム自身が出すイベントの game 名 */
export const PLATFORM_GAME = 'platform'

export type LogData = Record<string, string | number | boolean | null>

export interface LogEvent {
  /** ISO 8601 の時刻 */
  t: string
  /** 1回のあそび（タブを開いてから閉じるまで）を区別するランダムな id */
  sessionId: string
  /** 'platform' か、ゲームの id（例: 'cake', 'shateki'） */
  game: string
  /** イベントの種類（例: 'game_open', 'stage_clear'） */
  type: string
  data?: LogData
}

/** localStorage / sessionStorage と同じ形の最小インターフェース */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface LogStore {
  log(game: string, type: string, data?: LogData): void
  all(): LogEvent[]
  clear(): void
  exportJson(): string
}

const isLogEvent = (value: unknown): value is LogEvent => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.t === 'string' &&
    typeof v.sessionId === 'string' &&
    typeof v.game === 'string' &&
    typeof v.type === 'string'
  )
}

const randomId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)

/** タブごとに1つの sessionId を返す。同じタブで開いたゲームも同じ id を使える。 */
export function getSessionId(storage: KeyValueStorage | null): string {
  try {
    const saved = storage?.getItem(SESSION_STORAGE_KEY)
    if (saved) return saved
    const created = randomId()
    storage?.setItem(SESSION_STORAGE_KEY, created)
    return created
  } catch {
    return randomId()
  }
}

export function createLogStore(
  storage: KeyValueStorage | null,
  sessionId: string,
  now: () => Date = () => new Date(),
): LogStore {
  const read = (): LogEvent[] => {
    try {
      const raw = storage?.getItem(LOG_STORAGE_KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(isLogEvent) : []
    } catch {
      return []
    }
  }

  const write = (events: LogEvent[]): void => {
    try {
      storage?.setItem(LOG_STORAGE_KEY, JSON.stringify(events))
    } catch {
      // 容量不足などでもゲームは止めない
    }
  }

  return {
    log(game, type, data) {
      const event: LogEvent = { t: now().toISOString(), sessionId, game, type }
      if (data !== undefined) event.data = data
      write([...read(), event].slice(-MAX_EVENTS))
    },
    all: read,
    clear() {
      write([])
    },
    exportJson() {
      const events = read()
      return JSON.stringify({ exportedAt: now().toISOString(), count: events.length, events }, null, 2)
    },
  }
}

/** ブラウザ用の共有インスタンス。ストレージが使えない環境でも例外を出さない。 */
const safeStorage = (kind: 'localStorage' | 'sessionStorage'): KeyValueStorage | null => {
  try {
    return window[kind]
  } catch {
    return null
  }
}

export const logStore: LogStore = createLogStore(
  safeStorage('localStorage'),
  getSessionId(safeStorage('sessionStorage')),
)
