# 射的のログ（schemaVersion: 2）

issue #20 で見直したログの説明です。データ分析班の要望との対応は、下の「要望との対応」にまとめています。

## 取り出し方

設定パネル（展示モードでは `Ctrl + Shift + S` で開くスタッフ用パネル）の「JSONをダウンロード」。ファイル名は `shateki-log-年月日-時分.json` です。ダウンロードしてもログは消えません。

```json
{
  "schemaVersion": 2,
  "exportedAt": "2026-11-07T01:23:45.000Z",
  "deviceId": "パソコン（ブラウザ）ごとの id",
  "count": 123,
  "attempts": [ /* 挑戦ごとのまとめ（1回の挑戦 = 1行） */ ],
  "events": [ /* 時系列のすべてのイベント */ ]
}
```

- 個人情報は記録しません。id はすべてランダムな英数字です
- 時刻 `t`・`startedAt` は UTC の ISO 形式です。`〜Ms` はミリ秒で、画面が隠れていた時間も含みます（除きたいときは `page_hide` と `page_show` の間を引きます）
- `sessionId` がないイベントは、この見直しより前の形（版 1）です

## id と区切り

| 項目 | 変わるとき | 使い方 |
| --- | --- | --- |
| `deviceId` | 変わらない（ブラウザのサイトデータを消すと変わる） | 複数のパソコンのログをまとめたときに区別する |
| `sessionId` | ページを開くたび | 再読み込みしたかがわかる |
| `playerId` | スタッフ用パネルの「つぎの人へ」を押したときだけ | **遊んだ人の区切り**。押し忘れると、2人分が同じ id になる |
| `attemptId` | 問題を始めるたび（やり直し・べつの解き方・つぎの問題も） | 1回の挑戦 |
| `seq` | 起動ごとに 1 から数える通し番号 | 抜けや順番の確認 |

## 挑戦ごとのまとめ（`attempts`）

1回の挑戦 = 1行。表にするときはこちらを使うと楽です。

| 列 | 内容 |
| --- | --- |
| `deviceId` / `sessionId` / `playerId` / `attemptId` | 上の id |
| `variant` / `shooter` / `stage` / `problemId` / `goal` | 遊んだもの（`goal` は目標の数） |
| `startedAt` | 始めた時刻 |
| `startReason` | どうやって始めたか：`first`（最初）、`retry`（やり直し）、`another_way`（べつの解き方をさがす）、`next`（つぎの問題）、`switch`（スタッフ・開発者が設定パネルで問題・バリエーション・射撃タイプを切り替えた）、`select`（ステージセレクトのマップで問題を選んだ）、`next_player`（つぎの人へ） |
| `attemptNo` | その人がその問題（射撃タイプ別）に何回目の挑戦か。再読み込みすると 1 から数え直す |
| `foundBefore` | 始めたとき、図鑑でその問題の解き方をいくつ見つけていたか |
| `result` | `clear`（クリア）、`out`（弾切れ）、`restart`（さいしょから）、`leave`（1発以上撃ってから、終わる前に別の問題・つぎの人へ移った）、`unfinished`（終わりの記録がない。1発も撃たずに移った・画面を閉じた・ダウンロードした時点で遊んでいる途中など） |
| `expression` | 最後の式（当てた順。1つも当てていなければ `0`） |
| `key` | 解き方のキー（クリア・弾切れのときだけ）。同じ解き方は同じキーになる（例：`+5,+10*2`） |
| `isNew` | クリアしたとき、図鑑にとって新しい解き方だったか |
| `shots` / `hits` | 撃った数・当てた数 |
| `firstShotMs` | 始めてから1発目の当たり・外れが決まるまで |
| `elapsedMs` | 始めてから終わりまで（終わりの記録がなければ空） |
| `pageHides` | 挑戦の途中で画面が隠れた回数 |

## イベント（`events`）

すべてのイベントに `t`（時刻）・`sessionId`・`seq`・`playerId` が入ります。遊びのイベントには、さらに `variant` / `shooter`（`tap` / `gun` / `sling` / `catapult`。`catapult` は輪投げ（#38 でカタパルトから置き換え））/ `stage` / `problemId` / `attemptId` が入ります。

| `type` | いつ | 主な項目 |
| --- | --- | --- |
| `session_start` | ページを開いた | `deviceId`、`mode`（`exhibit` / `dev`）、`settings`（その時点の設定すべて） |
| `player_start` | 新しい人が遊び始めた | `reason`：`first`（このパソコンで初めて開いた）/ `next_player`（つぎの人へ） |
| `settings_change` | 設定パネルを閉じたとき、設定が変わっていた | `settings`（変更後の設定すべて） |
| `problem_start` | 問題を始めた | `reason`、`attemptNo`、`foundBefore` |
| `shot` | 1発の当たり・外れが決まった | `aim`（狙った位置。フィールド左上 0,0〜右下 1,1）、`hitLabel`、`assist`（当たり判定の倍率。1 = 補正なし）、`shotsLeftBefore`、`sinceStartMs`、`aimMs`（押してから離すまで。タップは空）、`reachableAfter`（残りの弾で届くか）、`launch`（パチンコ・輪投げだけ：角度・引っ張り・飛んでいた時間・はね返り・着地点） |
| `value_change` | 的に当たって数が変わった | `op`、`value`、`before`、`after`、`reachable` |
| `clear` | クリア | `key`、`expression`、`isNew`、`foundCount`、`totalCount`、`elapsedMs` |
| `out_of_shots` | 弾切れ | `current`、`goal`、`diff`、`expression`、`key`、`elapsedMs` |
| `restart` | 「さいしょから」を押した | `current`、`shotsLeft`、`expression`、`elapsedMs` |
| `attempt_leave` | 1発以上撃ってから、終わる前に別の問題・つぎの人へ移った | `current`、`shotsLeft`、`expression`、`elapsedMs` |
| `page_hide` / `page_show` | 画面が隠れた（タブの切り替え・閉じたなど）／戻った | `page_hide` は `current`、`shotsLeft` |

時間について：

- `sinceStartMs` と `firstShotMs` は「当たり・外れが決まった時点」です。パチンコ・輪投げは飛んでいる時間（`launch.flightMs`）を含みます。押し始めた時点は、`sinceStartMs` − `aimMs`（パチンコ・輪投げはさらに − `flightMs`）でおおよそわかります

## 要望との対応（issue #20）

○ = 取れる、△ = 一部・計算すれば取れる、× = 今は取れない

| 要望 | 対応 | 取り方 |
| --- | --- | --- |
| クリアまでの時間 | ○ | `attempts` の `result = clear` の `elapsedMs` |
| 挑戦回数 | ○ | `attempts` の行数（人・問題ごと）、`attemptNo` |
| 失敗回数 | ○ | `result = out`（弾切れ）の数。`restart`（自分でやり直した）も別に数えられる |
| 途中離脱したかどうか | ○ | `result = leave` / `unfinished`、`page_hide`。人の最後の挑戦が `unfinished` なら、そこでやめた |
| クリアしたか | ○ | `result = clear` |
| スタートしてから1個目の操作をするまでの時間 | △ | 問題ごと：`firstShotMs`（当たり・外れが決まった時点。上の「時間について」）。人ごと：`player_start` の時刻から最初の `shot` の時刻まで |
| 迷っているか | △ | `aimMs`（狙っていた時間）、`firstShotMs`、`shot` の間隔 |
| 成功・失敗を問わず、途中式を含めて結果を記録 | ○ | `attempts` の `expression`（全部の結果で入る）。途中は `value_change` |
| 作った計算結果 | ○ | 同上。`key` で同じ解き方をまとめられる |
| 別解を探すか | ○ | `startReason = another_way`、`foundBefore` |
| 途中式の難易度・難易度別の達成度 | △ | 難易度は未定。`key`（解き方）が残っているので、解き方ごとの難易度表ができれば後から計算できる。ステージ構成に合わせた重み付けも、`attempts` の `stage` / `problemId` / `result` から後で付けられる |
| ヒントの使用回数・押したタイミング | × | ヒントの機能がまだない。作るときにその issue でログを足す |
| 「ゲキムズ」の挑戦・時間・回数・クリア | × | 機能がまだない。同上 |
| チュートリアルをスキップしたか | × | 機能がまだない（#15）。同上 |
| アンケート | ー | ゲームの外で行う |
