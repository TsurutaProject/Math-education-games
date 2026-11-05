# apps/platform のファイル構成

`apps/platform/` は、算数ゲームをまとめる「親」のアプリです（React + Vite + TypeScript。ゲームと同じ構成）。
ここでは、どのファイルが何をしているかをまとめます。使い方・ログのきまりは [../README.md](../README.md) を見てください。

## 全体図

```
apps/platform/
├─ README.md                 使い方、公開の形、ログのきまり
├─ docs/
│  └─ structure.md           このファイル（ファイル構成）
├─ index.html                入口の HTML（<div id="root"> と main.tsx の読み込みだけ）
├─ package.json              依存パッケージと npm スクリプト（dev / build / test）
├─ package-lock.json         依存のバージョン固定（CI の npm ci が使う）
├─ vite.config.ts            Vite と vitest の設定（base: './' で相対パスにしている）
├─ tsconfig.json             TypeScript 設定の親（下の2つを束ねるだけ）
├─ tsconfig.app.json         src/ 用の設定（strict など）
├─ tsconfig.node.json        vite.config.ts 用の設定
└─ src/
   ├─ main.tsx               画面を描き始める場所。CSS もここで読み込む
   ├─ App.tsx                URL の # を見て、ホームかログ確認ページかを切り替える
   ├─ pages/
   │  ├─ HomePage.tsx        ホーム（ゲーム選択）。開いたときと、ゲームを選んだときにログを書く
   │  └─ AdminLogPage.tsx    ログの確認ページ（#/admin）。集計、JSON ダウンロード、消去
   ├─ components/
   │  ├─ GameCard.tsx        ゲーム1つ分のカード。遊べるものは <a>、準備中は <div>
   │  └─ RubyText.tsx        ふりがな付きの文字列を表示する
   ├─ data/
   │  └─ games.ts            ゲームの一覧（名前・色・アイコン・URL・NEW!）。ゲームを足すときはここ
   ├─ log/
   │  ├─ logStore.ts         ログの保存・読み出し（localStorage）。ブラウザに依存しない形で書いてある
   │  ├─ logStore.test.ts    logStore のテスト
   │  ├─ summary.ts          ログの集計（件数、セッション数、種類別）
   │  ├─ summary.test.ts     summary のテスト
   │  └─ downloadLog.ts      ログを JSON ファイルとしてダウンロードする（ブラウザ専用）
   └─ styles/
      ├─ tokens.css          共通デザインの部品（色・角丸・影・フォント）
      └─ app.css             ホームとログ確認ページのレイアウト
```

## 画面とデータの流れ

```
index.html → main.tsx → App.tsx ─┬─ （URL が / ）   → HomePage ─ GameCard ×N（games.ts から）
                                 └─ （URL が #/admin）→ AdminLogPage

HomePage / ゲーム ──logStore.log()──▶ localStorage（mathgames:log:v1）◀──logStore.all()── AdminLogPage
```

- カードをタップすると、ふつうのリンクとして `./cake/` や `./shateki/` へ移ります（ゲームは別のアプリ）。移る直前に `game_open` のログを1件書きます。
- ログは書くたびに保存先を読み直してから追記します。ゲーム側が書いたログを、プラットフォーム側が古い状態で上書きして消さないためです。

## 「これを変えたいとき」はどこを直す？

| やりたいこと | 直す場所 |
| --- | --- |
| ゲームを足す・並べ替える・入れ替える | `src/data/games.ts` の `games` |
| ゲームの色を変える | `src/styles/tokens.css` の `--color-game-*`（`games.ts` はその色を参照している） |
| 背景色・角丸・影・フォントを変える | `src/styles/tokens.css` |
| ホームの見出し「あそぶゲームを えらんでね！」を変える | `src/pages/HomePage.tsx` |
| カードの形・大きさ・NEW! リボンを変える | `src/styles/app.css`（`.game-card`、`.ribbon`） |
| アイコンを絵文字から画像にする | `src/data/games.ts` の `icon` と `src/components/GameCard.tsx` |
| ふりがなを付ける・直す | `src/data/games.ts` の `title`（`{ base: '射的', rt: 'しゃてき' }` の形） |
| プラットフォームから出すログを増やす | `logStore.log(...)` を呼ぶ（例: `HomePage.tsx`） |
| ゲーム側からログを書く | `../README.md` の「ゲーム側から書く」のコードをコピー |
| ログの上限件数・保存先のキーを変える | `src/log/logStore.ts` の `MAX_EVENTS`、`LOG_STORAGE_KEY`（ゲーム側と必ずそろえる） |
| 公開用にまとめる | リポジトリ直下の `scripts/build-all.sh` |

## `apps/platform/` の外で変えたところ

| ファイル | 変更 |
| --- | --- |
| `scripts/build-all.sh`（新規） | プラットフォームと各ゲームをビルドして、`dist/`（`/`、`/cake/`、`/shateki/`）にまとめる |
| `.github/workflows/ci.yml` | CI の対象に `apps/platform` を追加（テストとビルド） |
| `README.md` | `apps/` の説明に `apps/platform` を書き、起動方法を追加 |

`games/cake` と `prototypes/shateki-compare` のコードは変えていません。
