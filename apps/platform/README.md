# apps/platform（プラットフォーム）

算数ゲームをまとめる「親」になるアプリです。いまあるのは次の3つ。

- **ホーム画面（ゲーム選択）**: ゲームが横並びのカードで出てくる。カードをタップすると、そのゲームへ移る。
- **共通デザイン**: 色・角丸・影・フォントを `src/styles/tokens.css` にまとめた（Figma「PJ_仮」から採取）。
- **共通ログ**: プラットフォームと各ゲームが、同じ保存先・同じ形でログを書く。確認用ページあり。

ゲームの中の画面（タイトル、ステージ選択、プレイ画面）は、これまでどおり各ゲームが持ちます。

## 起動

Node.js 20 以上が必要です。

```bash
cd apps/platform
npm install
npm run dev      # 開発サーバー
npm test         # ログまわりのテスト
npm run build    # 型チェック + ビルド
```

## 画面

| URL | 中身 |
| --- | --- |
| `/` | ホーム（ゲーム選択）。小学生が見る画面 |
| `/#/admin` | ログの確認用ページ。件数の集計・JSON ダウンロード・ログ消去。子ども向けの画面からはリンクしていない |

## ゲームを足す・入れ替える

[src/data/games.ts](src/data/games.ts) の `games` を直すだけです（並び順もここ）。
`href` を書かないゲームは「じゅんびちゅう」の表示になり、タップできません。

## 公開の形と、開発中のつなぎ方

公開するときは、プラットフォームと各ゲームを同じ場所に並べます。

```
/           ← apps/platform（ホーム）
/cake/      ← games/cake
/shateki/   ← prototypes/shateki-compare（本番版 games/shateki ができたら差し替え）
```

[`scripts/build-all.sh`](../../scripts/build-all.sh) を実行すると、この形の `dist/` ができます。
同じ場所に置くので、ログ（localStorage）をプラットフォームとゲームで共有できます。

開発中に、別のポートで起動したゲームへつなぎたいときは `apps/platform/.env.local` に書きます（git には入りません）。

```
VITE_GAME_CAKE_URL=http://localhost:5174/
VITE_GAME_SHATEKI_URL=http://localhost:5175/
```

ログを共有するには、プラットフォームとゲームが同じ URL（同じホスト・同じポート）の配下にある必要があります。
別のポートで動かしている間は、ログはそれぞれ別になります。

## ログのきまり

何のログを取るかは、まだ決まっていません。ここでは「入れ物」だけを決めています。

- 保存先: `localStorage` の `mathgames:log:v1`（配列）。上限 5000 件で、超えたら古いものから消える。
- 1件の形:

  ```json
  { "t": "2026-11-01T01:02:03.000Z", "sessionId": "ab12cd34", "game": "cake", "type": "stage_clear", "data": { "stage": 2 } }
  ```

  - `sessionId`: タブを開いてから閉じるまでの id。`sessionStorage` の `mathgames:session` に入っていて、同じタブで開いたゲームとも共通。
  - `game`: `platform` か、ゲームの id（`cake`, `shateki`）。
  - `type`: イベントの種類。ゲームごとに自由に決めてよい。
  - `data`: 短い数値・文字・真偽だけ（入れ子にしない）。
- **個人情報は入れない**（名前や自由入力の文字など。[docs/concept.md](../../docs/concept.md) のとおり）。

プラットフォームが出すイベントは今のところ `platform / home_view`（ホームを開いた）と `platform / game_open`（`data.gameId` のゲームを開いた）の2つです。

### ゲーム側から書く（コピーして使える最小版）

ほかのゲームの `package.json` に何も足さずに使えます。

```ts
const LOG_KEY = 'mathgames:log:v1'
const SESSION_KEY = 'mathgames:session'

export function logEvent(game: string, type: string, data?: Record<string, string | number | boolean | null>) {
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY)
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem(SESSION_KEY, sessionId)
    }
    const events = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
    events.push({ t: new Date().toISOString(), sessionId, game, type, ...(data ? { data } : {}) })
    localStorage.setItem(LOG_KEY, JSON.stringify(events.slice(-5000)))
  } catch {
    // ログが書けなくても、ゲームは止めない
  }
}
```

例: `logEvent('cake', 'stage_clear', { stage: 2, served: 5 })`

射的プロトタイプは、いまは独自のログ（`shateki-log-v1`）を持っています。共通のログに寄せるかどうかは、取りたいログが決まってから決めます。

## ファイル構成

各ファイルの役割や「これを変えたいときはどこを直すか」は [docs/structure.md](docs/structure.md) にまとめています。ざっくりした全体図は次のとおりです。

```
apps/platform/
├─ index.html
├─ src/
│  ├─ main.tsx, App.tsx          # 入口。#/admin だけ切り替える
│  ├─ pages/                     # HomePage（ホーム）, AdminLogPage（ログ確認）
│  ├─ components/                # GameCard, RubyText（ふりがな）
│  ├─ data/games.ts              # ゲームの一覧
│  ├─ log/                       # logStore（保存）, summary（集計）, downloadLog
│  └─ styles/                    # tokens.css（共通デザイン）, app.css
```

## これから

- ゲームの中の見た目（分ケーキのタイトル・ステージ選択など）にも共通デザインを広げる。広げる段階で `tokens.css` を `packages/` に切り出す。
- 取りたいログが決まったら、`type` の一覧と、各ゲームへの `logEvent` の埋め込みを決める。
