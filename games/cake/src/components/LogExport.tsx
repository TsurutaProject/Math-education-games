import { useEffect, useRef, useState } from 'react'
import { getResearch } from '../research/recorder'

export function LogExport({ open, onChange }: { open: boolean; onChange: (open: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<'settings' | 'export' | 'reset'>('settings')
  const [error, setError] = useState('')
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])
  const download = () => {
    const recorder = getResearch()
    recorder.event('export', { format: 'json' })
    const blob = new Blob([recorder.export('json')], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cake-log-${recorder.log.playerId.slice(0, 8)}-${new Date().toISOString().replaceAll(':', '-')}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10000)
    onChange(false)
  }
  const resetProgress = () => {
    try {
      // Reset only this game's progress and research data.
      const keys = ['fraction-cake-guided-tutorial-seen-v3', 'cake-game:completed-stages', 'cake-game:stage-serves', 'cake-game:max-unlocked-stage', 'cake-game:unlocked-cakes']
      for (const key of keys) window.localStorage.removeItem(key)
      getResearch().resetAll()
      window.location.reload()
    } catch {
      setError('クリアできませんでした。ブラウザーの保存設定を確認してください。')
    }
  }
  return <>
    <button type="button" className="sound-toggle research-export" aria-label="設定" aria-haspopup="dialog" onClick={() => { setView('settings'); setError(''); onChange(true) }}>⚙️</button>
    <dialog className="research-dialog" ref={dialog} onCancel={() => onChange(false)} aria-labelledby="research-title">
      <h2 id="research-title">{view === 'settings' ? '設定' : view === 'export' ? 'ログを取得しますか？' : 'キャッシュをクリアしますか？'}</h2>
      {view === 'settings' ? <>
        <div className="research-settings">
          <button type="button" onClick={() => setView('export')}>ログ取得</button>
          <button type="button" onClick={() => setView('reset')}>キャッシュクリア</button>
        </div>
        <div className="research-actions"><button type="button" autoFocus onClick={() => onChange(false)}>閉じる</button></div>
      </> : view === 'export' ? <>
        <p>途中までの記録も保存できます。取得してもプレイ記録は消えません。</p>
        <p>すべての記録を1つのJSONファイルで保存します。</p>
        <div className="research-actions"><button type="button" onClick={() => setView('settings')}>キャンセル</button><button type="button" onClick={download}>取得する</button></div>
      </> : <>
        <p>ステージの進捗・ケーキの解放状態・売上・コンボ・トロフィーをリセットし、初回チュートリアルからやり直します。この操作は元に戻せません。</p>
        <p>収集済みのログ・集計・匿名IDも初期化します。必要なログは先に取得してください。</p>
        <div className="research-actions"><button type="button" onClick={() => setView('settings')}>キャンセル</button><button type="button" onClick={resetProgress}>クリアしてやり直す</button></div>
      </>}
      {error && <p role="alert">{error}</p>}
      {open && getResearch().storageError && <p role="alert">{getResearch().storageError}</p>}
    </dialog>
  </>
}
