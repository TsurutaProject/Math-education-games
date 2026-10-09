import { useEffect, useMemo, useState } from 'react'
import { downloadLog } from '../log/downloadLog'
import { LOG_STORAGE_KEY, logStore } from '../log/logStore'
import { summarizeLog } from '../log/summary'

const RECENT_COUNT = 30

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ja-JP', { hour12: false })
}

/**
 * ログの確認用ページ（#/admin）。子ども向けの画面からはリンクしていない。
 * ダウンロードした JSON を、あとで集計・分析に使う。
 */
export function AdminLogPage() {
  const [events, setEvents] = useState(() => logStore.all())
  const refresh = (): void => setEvents(logStore.all())

  useEffect(() => {
    // 別のタブ（ゲーム）でログが増えたら追いかける
    const onStorage = (e: StorageEvent): void => {
      if (e.key === LOG_STORAGE_KEY || e.key === null) setEvents(logStore.all())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const summary = useMemo(() => summarizeLog(events), [events])
  const recent = useMemo(() => events.slice(-RECENT_COUNT).reverse(), [events])

  const handleClear = (): void => {
    if (window.confirm('ログを全部消します。元に戻せません。よろしいですか？')) {
      logStore.clear()
      refresh()
    }
  }

  return (
    <main className="admin">
      <p>
        <a href="#/">← ホームへもどる</a>
      </p>
      <h1>ログの確認</h1>
      <p className="admin__note">
        このブラウザに保存されているログです。個人情報は記録していません。
      </p>

      <div className="admin__actions">
        <button type="button" onClick={downloadLog} disabled={events.length === 0}>
          JSON でダウンロード
        </button>
        <button type="button" onClick={refresh}>
          更新
        </button>
        <button type="button" className="is-danger" onClick={handleClear} disabled={events.length === 0}>
          ログを消す
        </button>
      </div>

      <dl className="admin__totals">
        <div>
          <dt>イベント数</dt>
          <dd>{summary.total}</dd>
        </div>
        <div>
          <dt>あそんだ回数（セッション）</dt>
          <dd>{summary.sessions}</dd>
        </div>
      </dl>

      <h2>種類ごとの件数</h2>
      {summary.byKind.length === 0 ? (
        <p>まだログがありません。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ゲーム / 種類</th>
              <th>件数</th>
            </tr>
          </thead>
          <tbody>
            {summary.byKind.map((row) => (
              <tr key={row.kind}>
                <td>{row.kind}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>新しいログ（最大{RECENT_COUNT}件）</h2>
      {recent.length === 0 ? (
        <p>まだログがありません。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>時刻</th>
              <th>ゲーム</th>
              <th>種類</th>
              <th>内容</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((e, i) => (
              <tr key={`${e.t}-${i}`}>
                <td>{formatTime(e.t)}</td>
                <td>{e.game}</td>
                <td>{e.type}</td>
                <td>{e.data ? JSON.stringify(e.data) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
