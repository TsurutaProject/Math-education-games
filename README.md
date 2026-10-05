# Math-education-games

小学校高学年向けの算数ゲームを集めるプラットフォームのリポジトリです（大学チーム／11月の文化祭で遊んでもらう予定）。
狙い：算数が苦手な子でも「試行錯誤できる」「解き方が何通りもある」体験を通して、算数の入り口のハードルを下げる。詳しくは [docs/concept.md](docs/concept.md)。

## いま入っているもの

| フォルダ | 中身 | 状態 |
| --- | --- | --- |
| [prototypes/shateki-compare](prototypes/shateki-compare) | 算数×射的ゲームの比較用プロトタイプ（A/B/C × コルク銃/パチンコ/カタパルト） | 遊び比べ中 |
| games/cake | ケーキゲーム | 担当者が追加予定 |

## フォルダの考え方

```
Math-education-games/
├─ apps/          プラットフォーム本体（ゲームを選ぶ画面・共通の設定やログ）※これから
├─ games/         本番のゲーム。1ゲーム = 1フォルダ（例：games/shateki, games/cake）
├─ packages/      複数のゲームで使う部品 ※2つめのゲームができたときに切り出す
├─ prototypes/    遊び比べ・検証用の試作。本番に直接はつなげない
└─ docs/          コンセプト、遊び比べの結果など
```

- 当面は **各フォルダが独立したアプリ** です（それぞれに `package.json` があり、そのフォルダの中で `npm install` する）。
  ゲームが2つそろい、共通にできる部品が見えてきた段階で、`packages/` への切り出しと npm workspaces の導入を検討します。
- ゲームの追加方法は [games/README.md](games/README.md) を見てください。

## 射的プロトタイプを動かす

Node.js 20 以上が必要です。

```bash
cd prototypes/shateki-compare
npm install
npm run dev
```

遊び方・設定・ログについては [prototypes/shateki-compare/README.md](prototypes/shateki-compare/README.md)、
遊び比べのチェック項目は [prototypes/shateki-compare/docs/PLAYTEST.md](prototypes/shateki-compare/docs/PLAYTEST.md) にあります。

## 進め方（おすすめ）

- `main` に直接 push せず、作業ごとにブランチを切って Pull Request を出す（例：`shateki/xxx`, `cake/xxx`）
- Pull Request では GitHub Actions がテストとビルドを自動で実行する（[.github/workflows/ci.yml](.github/workflows/ci.yml)）
- 遊び比べで出た意見や不具合は GitHub の Issue に書く
