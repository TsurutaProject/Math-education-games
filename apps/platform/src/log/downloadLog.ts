import { logStore } from './logStore'

/** ログを JSON ファイルとしてダウンロードする（ブラウザ専用）。 */
export function downloadLog(): void {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`

  const blob = new Blob([logStore.exportJson()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `mathgames-log-${stamp}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
