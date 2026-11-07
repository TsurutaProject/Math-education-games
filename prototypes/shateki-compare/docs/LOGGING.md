# 射的のログ（schemaVersion: 3）

issue #20 で見直し、#56 でステージの作り直し（#52）に合わせたログの説明です。データ分析班の要望との対応は、下の「要望との対応」にまとめています。

## 版 3 で変わったこと（#56）

ステージを単元ごとに作り直したので、同じ名前の項目でも意味が変わったものがあります。ファイルの `schemaVersion` で見分けてください（版 2 までのログは 2）。

| 項目 | 版 2 まで | 版 3 |
| --- | --- | --- |
| `stage` | バリエーションの中の区切り（1〜3 問目が 1、4〜6 問目が 2） | 単元のステージ（1 たしざん・2 ひきざん・3 かけざん・わりざん） |
| `mapNo` | 「バリエーションの順番-何問目」（`2-5` ＝ B の 5 問目） | 「ステージ-何問目」（`2-5` ＝ ステージ 2 の 5 問目） |
| `variant` | どのステージ（マップのページ）か | その問題の遊び方。1つのステージの中で問題ごとに変わる |
| 問題 id | `std-2-1` などは「+ − ×2」の問題 | ステージ 1 は前と同じ問題・同じ id（`std-1-1` など）。ステージ 2・3 は新しい問題で、id は `std-s2-1` のように `s` が付く。前の「+ − ×2」の問題はもう使わない |

足した項目：`unit`・`role`（`problem_start`・`attempts`）、`pressMs`（`shot`）、`firstPressMs`（`attempts`）、`map_open`・`map_select`（イベント）。

起動するとマップから始まるので、版 3 では `problem_start` の `reason` は、ほとんどが `select`（マップで選んだ）か `next`・`retry`・`another_way` になります。`first` と `next_player` は出ません（つぎの人へはマップにもどり、そこで選んだ問題は `select`）。

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
| `variant` / `shooter` / `stage` / `problemId` / `goal` | 遊んだもの（`goal` は目標の数。`stage` は単元のステージ、`variant` はその問題の遊び方） |
| `startedAt` | 始めた時刻 |
| `startReason` | どうやって始めたか：`select`（マップで問題を選んだ）、`retry`（やり直し）、`another_way`（べつの解き方をさがす）、`next`（つぎの問題）、`switch`（スタッフ・開発者が設定パネルで問題・射撃タイプを切り替えた）。版 2 までは `first`（最初）・`next_player`（つぎの人へ）もあった |
| `attemptNo` | その人がその問題（射撃タイプ別）に何回目の挑戦か。再読み込みすると 1 から数え直す |
| `foundBefore` | 始めたとき、図鑑でその問題の解き方をいくつ見つけていたか |
| `mapNo` | マップの番号（例 `2-5` ＝ステージ 2 の 5 問目。版 2 では「バリエーションの順番-何問目」）。#42 より前のログでは `null` |
| `unit` | 単元：`add`（たしざん）、`sub`（ひきざん）、`muldiv`（かけざん・わりざん）。版 3 より前のログでは `null` |
| `role` | `intro`（はじめの、単元を伝える問題。A・B）か `main`（メインの問題。C・D・E）。版 3 より前のログでは `null` |
| `result` | `clear`（クリア）、`out`（弾切れ）、`restart`（さいしょから）、`leave`（1発以上撃ってから、終わる前に別の問題・つぎの人へ移った）、`unfinished`（終わりの記録がない。1発も撃たずに移った・画面を閉じた・ダウンロードした時点で遊んでいる途中など） |
| `expression` | 最後の式（当てた順。1つも当てていなければ `0`） |
| `key` | 解き方のキー（クリア・弾切れのときだけ）。同じ解き方は同じキーになる（例：`+5,+10*2`） |
| `isNew` | クリアしたとき、図鑑にとって新しい解き方だったか |
| `shots` / `hits` | 撃った数・当てた数 |
| `firstShotMs` | 始めてから1発目の当たり・外れが決まるまで |
| `firstPressMs` | 始めてから1発目を押し始めるまで（タップは押した時点）。版 3 より前のログ・撃っていない挑戦では `null` |
| `elapsedMs` | 始めてから終わりまで（終わりの記録がなければ空） |
| `pageHides` | 挑戦の途中で画面が隠れた回数 |
| `hints` | ヒントを押した回数（#57） |

## イベント（`events`）

すべてのイベントに `t`（時刻）・`sessionId`・`seq`・`playerId` が入ります。遊びのイベントには、さらに `variant` / `shooter`（`tap` / `gun` / `sling` / `ring`。`ring` は輪投げ。#42 より前のログでは輪投げを `catapult` と記録している）/ `stage` / `problemId` / `attemptId` が入ります。

| `type` | いつ | 主な項目 |
| --- | --- | --- |
| `session_start` | ページを開いた | `deviceId`、`mode`（`exhibit` / `dev`）、`settings`（その時点の設定すべて） |
| `player_start` | 新しい人が遊び始めた | `reason`：`first`（このパソコンで初めて開いた）/ `next_player`（つぎの人へ） |
| `settings_change` | 設定パネルを閉じたとき、設定が変わっていた | `settings`（変更後の設定すべて）。展示モードでは `settings.shooter` は使われない（射撃タイプは問題ごとに決まっている。#46） |
| `problem_start` | 問題を始めた | `reason`、`attemptNo`、`foundBefore`、`mapNo`（マップの番号。例 `2-5`）、`unit`、`role` |
| `map_open` | マップを開いた（版 3 から） | `reason`：`start`（起動したとき）/ `button`（「マップへ」）/ `course_end`（最後の問題のあと）/ `next_player`（つぎの人へ） |
| `map_select` | マップで問題を選んだ（版 3 から） | `mapNo`、`variant`、`unit`、`role`、`clearedMapNos`（その人がそれまでにクリアした問題。解き方を1つ以上見つけた問題）、`firstUnclearedMapNo`（コースの順で、まだクリアしていない最初の問題。全部クリアなら空）、`skippedMapNos`（選んだ問題より前にある、まだクリアしていない問題。空なら飛ばしていない）、`mapMs`（マップを開いてから選ぶまで）、`misses`（選ぶまでに的のないところを撃った回数） |
| `shot` | 1発の当たり・外れが決まった | `aim`（狙った位置。フィールド左上 0,0〜右下 1,1）、`hitLabel`、`assist`（当たり判定の倍率。1 = 補正なし）、`shotsLeftBefore`、`sinceStartMs`、`aimMs`（押してから離すまで。タップは空）、`pressMs`（始めてからこの1発を押し始めるまで。タップは押した時点。版 3 から）、`reachableAfter`（残りの弾で届くか）、`launch`（パチンコ・輪投げだけ：角度（小数点以下1桁）・引っ張り（整数）・飛んでいた時間・はね返り・着地点。#42 より前の輪投げのログは、角度と引っ張りを丸めていない） |
| `value_change` | 的に当たって数が変わった | `op`、`value`、`before`、`after`、`reachable` |
| `clear` | クリア | `key`、`expression`、`isNew`、`foundCount`、`totalCount`、`elapsedMs` |
| `out_of_shots` | 弾切れ | `current`、`goal`、`diff`、`expression`、`key`、`elapsedMs` |
| `restart` | 「さいしょから」を押した | `current`、`shotsLeft`、`expression`、`elapsedMs` |
| `tutorial` | はじめの手引き（#15）の手順が変わった | `step`（新しい手順：`map`・`goal`・`aim`・`changed`・`free`・`next`・`done`）、`from`（前の手順）、`fromMs`（前の手順にいた時間）、`skipped`（「とばす」で終えたとき `true`）。`step = map` は、クリアする前に 1-1 から出て、マップからやり直したとき。始まったことは残さない（その人の最初の `map_open` が始まり） |
| `pull_guide` | パチンコ・輪投げの指の手引き（#15）を終えた | `shooter`（`sling`・`ring`）、`skipped`（「とばす」を押したとき `true`。`false` なら1発撃った） |
| `hint` | ヒントを押した（#57） | `sinceStartMs`（始めてから押すまで）、`current`、`shotsLeft`（押したときの数・残りの弾）、`key`（選んだ解き方。クリアと同じ形のキー）、`targetId`・`targetLabel`（光らせた的）、`restart`（行ける解き方がなく「さいしょから」を強調したとき `true`。そのとき `key`・`targetId` は空） |
| `attempt_leave` | 1発以上撃ってから、終わる前に別の問題・つぎの人へ移った | `current`、`shotsLeft`、`expression`、`elapsedMs` |
| `page_hide` / `page_show` | 画面が隠れた（タブの切り替え・閉じたなど）／戻った | `page_hide` は `current`、`shotsLeft` |

時間について：

- `sinceStartMs` と `firstShotMs` は「当たり・外れが決まった時点」です。パチンコ・輪投げは飛んでいる時間（`launch.flightMs`）を含みます
- 押し始めた時点は、版 3 から `pressMs`（`attempts` では `firstPressMs`）にそのまま入ります。版 2 までのログでは、`sinceStartMs` − `aimMs`（パチンコ・輪投げはさらに − `flightMs`）でおおよそわかります

## 要望との対応（issue #20・#56）

○ = 取れる、△ = 一部・計算すれば取れる、× = 今は取れない

| 要望 | 対応 | 取り方 |
| --- | --- | --- |
| クリアまでの時間 | ○ | `attempts` の `result = clear` の `elapsedMs` |
| 挑戦回数 | ○ | `attempts` の行数（人・問題ごと）、`attemptNo` |
| 失敗回数 | ○ | `result = out`（弾切れ）の数。`restart`（自分でやり直した）も別に数えられる |
| 途中離脱したかどうか | ○ | `result = leave` / `unfinished`、`page_hide`。人の最後の挑戦が `unfinished` なら、そこでやめた |
| クリアしたか | ○ | `result = clear` |
| スタートしてから1個目の操作をするまでの時間 | ○ | 問題ごと：`attempts` の `firstPressMs`（版 3 から。押し始めた時点）。人ごと：`player_start` の時刻から最初の `shot` の時刻まで（マップで迷った時間は `map_select` の `mapMs`） |
| 迷っているか | ○ | 撃つまで：`pressMs`（押し始めるまで）、`aimMs`（狙っていた時間）、`shot` の間隔。問題を選ぶまで：`map_select` の `mapMs`・`misses` |
| 成功・失敗を問わず、途中式を含めて結果を記録 | ○ | `attempts` の `expression`（全部の結果で入る）。途中は `value_change` |
| 作った計算結果 | ○ | 同上。`key` で同じ解き方をまとめられる |
| 別解を探すか | ○ | `startReason = another_way`、`foundBefore` |
| 途中式の難易度・難易度別の達成度 | △ | 単元ごとの達成度は `attempts` の `unit`（版 3 から）と `result` で取れる（どの単元でつまずいたか）。問題ごと・解き方ごとの難易度はまだ決めていないが、`key`（解き方）が残っているので、難易度表ができれば後から計算できる |
| ヒントの使用回数・押したタイミング | ○ | 回数：`attempts` の `hints`。タイミング：`hint` の `sinceStartMs`・`current`・`shotsLeft`（#57） |
| 「ゲキムズ」の挑戦・時間・回数・クリア | × | 機能がまだない。作るときにその issue でログを足す |
| チュートリアルをスキップしたか | ○ | はじめの手引き（#15）：`tutorial` の `skipped`（どの手順で飛ばしたかは `from`）、手順ごとの時間は `fromMs`。パチンコ・輪投げの指の手引きは `pull_guide` の `skipped`。はじめの説明の問題（`role = intro`）をマップで飛ばしたかは、これまでどおり `map_select` の `skippedMapNos` |
| アンケート | ー | ゲームの外で行う |
