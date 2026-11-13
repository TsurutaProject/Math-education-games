import { FuriganaText } from './FuriganaText'
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
  useEffect(() => {
    const openSettings = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey
        || event.code !== 'KeyS' || event.repeat || event.isComposing) return
      event.preventDefault()
      setView('settings')
      setError('')
      onChange(true)
    }
    // The game runs in a same-origin design iframe. Listen on its parent too
    // so the shortcut works after clicking the surrounding page margin.
    const targets: Window[] = [window]
    try {
      if (window.parent !== window && window.parent.location.origin === window.location.origin) {
        targets.push(window.parent)
      }
    } catch { /* A cross-origin embed cannot expose its parent window. */ }
    targets.forEach(target => target.addEventListener('keydown', openSettings))
    return () => targets.forEach(target => target.removeEventListener('keydown', openSettings))
  }, [onChange])
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
    <dialog className="research-dialog" ref={dialog} onCancel={() => onChange(false)} aria-labelledby="research-title">
      <h2 id="research-title"><FuriganaText text={view === 'settings' ? '設定' : view === 'export' ? 'ログを取得しますか？' : 'キャッシュをクリアしますか？'} /></h2>
      {view === 'settings' ? <>
        <div className="research-settings">
          <button type="button" onClick={() => setView('export')}><FuriganaText text="ログ取得" /></button>
          <button type="button" onClick={() => setView('reset')}>キャッシュクリア</button>
        </div>
        <div className="research-actions"><button type="button" autoFocus onClick={() => onChange(false)}><FuriganaText text="閉じる" /></button></div>
      </> : view === 'export' ? <>
        <p><FuriganaText text="途中までの記録も保存できます。取得してもプレイ記録は消えません。" /></p>
        <p><FuriganaText text="すべての記録を1つのJSONファイルで保存します。" /></p>
        <div className="research-actions"><button type="button" onClick={() => setView('settings')}>キャンセル</button><button type="button" onClick={download}><FuriganaText text="取得する" /></button></div>
      </> : <>
        <p><FuriganaText text="ステージの進捗・ケーキの解放状態・売上・コンボ・トロフィーをリセットし、初回チュートリアルからやり直します。この操作は元に戻せません。" /></p>
        <p><FuriganaText text="収集済みのログ・集計・匿名IDも初期化します。必要なログは先に取得してください。" /></p>
        <div className="research-actions"><button type="button" onClick={() => setView('settings')}>キャンセル</button><button type="button" onClick={resetProgress}><FuriganaText text="クリアしてやり直す" /></button></div>
      </>}
      {error && <p role="alert"><FuriganaText text={error} /></p>}
      {open && getResearch().storageError && <p role="alert"><FuriganaText text={getResearch().storageError} /></p>}
    </dialog>
  </>
}
