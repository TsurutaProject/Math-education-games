import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/research/recorder.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } })
const { ResearchRecorder, LOG_KEY, toCsv } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const stage = { id: 'stage-1', title: '基本', targetServes: 3 }
const order = { id: 'half', target: { numerator: 1, denominator: 2 }, cakeKind: 'shortcake' }
const setup = () => {
  let time = 0
  const map = new Map()
  const storage = { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v) }
  const r = new ResearchRecorder(storage, () => time)
  return { r, storage, tick: n => { time += n }, now: () => time }
}
test('初回チュートリアル完了／あとでまでは計測しない', () => {
  for (const reason of ['complete', 'later', 'skip']) {
    const { r, tick } = setup()
    r.enter(stage, 0, false, true); r.setRunning(true, 'playing'); tick(10000); r.save()
    assert.equal(r.log.stages[0].activeMs, 0)
    r.tutorialEnd(reason, true); r.setRunning(true, 'playing'); r.ensureOrder(order); tick(1000); r.save()
    assert.equal(r.log.stages[0].activeMs, 1000)
  }
})
test('後からのチュートリアルは時計をリセットせず、時間とヒント集計から除外', () => {
  const {r,tick} = setup(); r.enter(stage,0,false,false); r.setRunning(true,'playing'); r.ensureOrder(order); tick(2000)
  r.tutorialStart(); tick(9000); r.action('hint_open'); r.tutorialEnd('complete',false); r.setRunning(true,'playing'); tick(3000); r.save()
  assert.equal(r.log.stages[0].activeMs,5000); assert.equal(r.log.orders[0].activeMs,5000); assert.equal(r.log.stages[0].hints,0)
})
test('タブ非表示、ポップアップ、ログ取得中の時間を除外', () => {
  const {r,tick}=setup(); r.enter(stage,0,false,false); r.setRunning(true,'playing'); tick(1000)
  for (const reason of ['hidden','feedback','export_dialog']) { r.setRunning(false,reason); tick(5000); r.setRunning(true,'playing'); tick(1000) }
  r.save(); assert.equal(r.log.stages[0].activeMs,4000)
})
test('途中で一覧に戻り再入場するとステージ時間を累積、注文は別インスタンス', () => {
  const {r,tick}=setup(); r.enter(stage,0,false,false); r.setRunning(true,'playing'); r.ensureOrder(order); tick(1000); r.action('hint_open'); r.leave('stage_select'); tick(5000)
  r.enter(stage,0,false,false); r.setRunning(true,'playing'); r.ensureOrder(order); tick(2000); r.save()
  assert.equal(r.log.stages.length,1); assert.equal(r.log.stages[0].activeMs,3000); assert.equal(r.log.orders.length,2); assert.equal(r.log.orders[0].status,'interrupted'); assert.notEqual(r.log.orders[0].id,r.log.orders[1].id)
})
test('リロード後も未クリアの集計・匿名IDは保持し、セッションは区別', () => {
  const {r,tick,storage,now}=setup(); r.enter(stage,0,false,false); r.setRunning(true,'playing'); r.ensureOrder(order); r.action('reset'); tick(2000); r.save()
  const next = new ResearchRecorder(storage,now); next.enter(stage,0,false,false)
  assert.equal(next.log.playerId,r.log.playerId); assert.notEqual(next.sessionId,r.sessionId); assert.equal(next.log.stages.length,1); assert.equal(next.log.stages[0].activeMs,2000); assert.equal(next.log.stages[0].resets,1); assert.equal(next.log.orders[0].status,'interrupted')
})
test('組み合わせ確認は提供試行と別イベント、販売は一度だけ', () => {
  const {r}=setup(); r.enter(stage,0,false,false); r.ensureOrder(order); r.action('submit',{quantityCorrect:true,recipeMatched:false}); r.action('recipe_mismatch_confirm'); r.sold({combo:8,recipeMatched:false,pieceCountMatched:false})
  assert.equal(r.log.orders[0].attempts,1); assert.equal(r.log.orders[0].status,'sold'); assert.equal(r.log.orders[0].recipeMatched,false); assert.equal(r.log.stages[0].sales,1); assert.equal(r.log.stages[0].maxCombo,8)
})
test('ヒントを開く回数・切り直しをステージごと／注文ごとに集計', () => {
  const {r}=setup(); r.enter(stage,0,false,false); r.ensureOrder(order); r.action('hint_open'); r.action('hint_open'); r.action('reset'); r.enter({...stage,id:'stage-2'},0,false,false); r.ensureOrder(order); r.action('hint_open')
  assert.deepEqual(r.log.stages.map(s=>s.hints),[2,1]); assert.equal(r.log.orders[0].resets,1); assert.equal(JSON.parse(r.export('json')).totalHints,3)
})
test('クリア時間は固定され再プレイとは分離', () => {
  const {r,tick}=setup(); r.enter(stage,0,false,false); r.setRunning(true,'playing'); tick(4000); r.clear(); tick(9000); r.save(); assert.equal(r.log.stages[0].clearMs,4000)
  r.enter(stage,3,true,false); r.setRunning(true,'playing'); tick(1000); r.save(); assert.equal(r.log.stages.length,2); assert.equal(r.log.stages[1].replay,true); assert.equal(r.log.stages[0].clearMs,4000)
})
test('未クリア・未販売でもJSON/CSVを取得でき保存データを消さない', () => {
  const {r,tick,storage}=setup(); r.enter(stage,0,false,false); r.ensureOrder(order); r.setRunning(true,'playing'); tick(1234)
  const data=JSON.parse(r.export('json')); assert.equal(data.stages[0].cleared,false); assert.equal(data.orders[0].status,'unfinished'); assert.equal(data.stages[0].activeMs,1234)
  assert.ok(r.export('stages').includes('unfinished')); assert.ok(r.export('orders').includes('unfinished')); assert.ok(storage.getItem(LOG_KEY))
})
test('トロフィーの内容・進捗・取得数を記録し同一状態を重複記録しない', () => {
  const {r}=setup(); const defs=[{id:'sale',title:'販売',description:'3人',metric:'servedCount',target:3}]
  r.trophies({servedCount:2},defs); r.trophies({servedCount:2},defs); r.trophies({servedCount:3},defs)
  const events=r.log.events.filter(e=>e.type==='trophy_progress'); assert.equal(events.length,2); assert.equal(events[1].data.acquiredCount,1); assert.equal(events[0].data.trophies[0].progress,2)
})
test('保存容量不足でもゲームを止めず、メモリーのログを書き出せる', () => {
  const r=new ResearchRecorder({getItem:()=>null,setItem:()=>{throw Error('quota')}}); r.action('hint_open'); assert.ok(r.storageError); assert.ok(JSON.parse(r.export('json')).events.some(e=>e.type==='hint_open'))
})
test('CSVはBOM・改行・引用符・数式文字を安全に扱う', () => {
  const csv=toCsv([{name:'あ,"い"\nう',formula:'=1+1'}]); assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('""い""')); assert.ok(csv.includes("'=1+1"))
})
test('まだステージを開始していなくてもCSVにヘッダーを出力', () => {
  const {r}=setup(); assert.ok(r.export('stages').includes('"clearSeconds"')); assert.ok(r.export('orders').includes('"recipeMatched"'))
})
test('同じ状態の再通知は重複記録しない', () => {
  const {r}=setup(); r.snapshot('combo_state',{current:0}); r.snapshot('combo_state',{current:0}); r.snapshot('combo_state',{current:1})
  assert.equal(r.log.events.filter(e=>e.type==='combo_state').length,2)
})
test('HTTP LAN環境でrandomUUIDがなくても匿名IDを生成できる', () => {
  const original=crypto.randomUUID
  try {
    crypto.randomUUID=undefined
    const {r}=setup(); assert.match(r.log.playerId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  } finally { crypto.randomUUID=original }
})
test('キャッシュクリアで記録・集計・匿名IDを初期化し終了時にも旧記録が戻らない', () => {
  const {r,tick,storage,now}=setup()
  r.enter(stage,0,false,false); r.setRunning(true,'playing'); r.ensureOrder(order); tick(2000); r.action('hint_open')
  const oldId=r.log.playerId
  r.resetAll()
  const cleared=JSON.parse(r.export('json'))
  assert.notEqual(cleared.playerId,oldId)
  assert.deepEqual(cleared.events,[]); assert.deepEqual(cleared.stages,[]); assert.deepEqual(cleared.orders,[]); assert.equal(cleared.totalHints,0)
  tick(5000); r.setRunning(false,'pagehide'); r.event('pagehide'); r.save()
  const reloaded=new ResearchRecorder(storage,now)
  const data=JSON.parse(reloaded.export('json'))
  assert.equal(data.playerId,cleared.playerId); assert.deepEqual(data.stages,[]); assert.deepEqual(data.orders,[]); assert.equal(data.totalHints,0)
  assert.ok(!data.events.some(e=>e.type==='hint_open' || e.type==='order_start'))
})
