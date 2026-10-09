/** ふりがな付きの文字列。文字列はそのまま、{ base, rt } は base の上に rt を表示する。 */
export type RubySegment = string | { base: string; rt: string }

export interface GameEntry {
  /** ログや URL に使う半角英小文字の名前 */
  id: string
  /** 画面に出す名前（漢字にはふりがなをつける） */
  title: RubySegment[]
  /** ふりがななしの名前（読み上げ用） */
  label: string
  /** ゲームのイメージカラー（色の元は styles/tokens.css） */
  color: string
  icon: string
  /** ゲームの URL。ないときは「じゅんびちゅう」でタップできない */
  href?: string
  isNew?: boolean
}

/**
 * ゲームの URL。公開するときは、プラットフォームと同じ場所の /cake/ /shateki/ に各ゲームを置く
 * （scripts/build-all.sh がその形にまとめる）。
 * 開発中に別のポートで起動したゲームへつなぐときは、apps/platform/.env.local に次のように書く。
 *   VITE_GAME_CAKE_URL=http://localhost:5174/
 */
const gameUrl = (envName: string, fallback: string): string => {
  const fromEnv: unknown = import.meta.env[envName]
  return typeof fromEnv === 'string' && fromEnv !== '' ? fromEnv : fallback
}

/** ホーム画面に並ぶ順番。ゲームを足す・入れ替えるときはここだけ直す。 */
export const games: GameEntry[] = [
  {
    id: 'shateki',
    title: ['さんすう', { base: '射的', rt: 'しゃてき' }],
    label: 'さんすう射的',
    color: 'var(--color-game-shateki)',
    icon: '🎯',
    href: gameUrl('VITE_GAME_SHATEKI_URL', './shateki/'),
  },
  {
    id: 'cake',
    title: [{ base: '分', rt: 'わ' }, 'ケーキ'],
    label: '分ケーキ',
    color: 'var(--color-game-cake)',
    icon: '🍰',
    href: gameUrl('VITE_GAME_CAKE_URL', './cake/'),
  },
  {
    id: 'next',
    title: ['？？？'],
    label: 'じゅんびちゅう',
    color: 'var(--color-game-next)',
    icon: '❓',
    isNew: true,
  },
]
