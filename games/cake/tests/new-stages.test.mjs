import { test } from 'node:test'
import assert from 'node:assert/strict'
import { importTs } from './import-ts.mjs'
const { evaluateOrder } = await importTs(new URL('../src/utils/orderEvaluation.ts', import.meta.url))
const { orders } = await importTs(new URL('../src/data/orders.ts', import.meta.url))
const { stages } = await importTs(new URL('../src/data/stages.ts', import.meta.url))
const { isAdminPath } = await importTs(new URL('../src/admin.ts', import.meta.url))
const piece = (cakeKind, numerator, denominator, toppings = []) => ({ cakeKind, fraction: { numerator, denominator }, toppings })
const evaluate = (order, pieces) => evaluateOrder(order, pieces, 'shortcake')
test('2種類は種類ごとの分量で判定し、同じ合計へのすり替えを許さない', () => {
  const order = orders.find(o => o.id === 'both-third-quarter')
  assert.equal(evaluate(order, [piece('chocolate', 1, 3), piece('shortcake', 1, 4)]).correct, true)
  assert.equal(evaluate(order, [piece('shortcake', 7, 12)]).correct, false)
  assert.equal(evaluate(order, [piece('shortcake', 1, 3), piece('chocolate', 1, 4)]).correct, false)
  assert.equal(evaluate(order, [piece('chocolate', 1, 3)]).correct, false)
  assert.equal(evaluate(order, [piece('chocolate', 1, 6), piece('chocolate', 1, 6), piece('shortcake', 1, 4)]).correct, true)
})
test('トッピングの指定は種類と個数がぴったりであることを要求する', () => {
  const order = orders.find(o => o.id === 'topping-strawberry')
  const strawberry = { kind: 'strawberry' }, banana = { kind: 'banana' }
  assert.equal(evaluate(order, [piece('shortcake', 1, 2, [strawberry, strawberry])]).correct, true)
  for (const toppings of [[], [strawberry], [banana, banana], [strawberry, strawberry, banana]]) {
    assert.equal(evaluate(order, [piece('shortcake', 1, 2, toppings)]).correct, false)
  }
  assert.equal(evaluate(order, [piece('shortcake', 1, 4, [strawberry]), piece('shortcake', 1, 4, [strawberry])]).correct, true)
})
test('個数だけの指定は好きな種類を許し、ケーキ量は別に検証する', () => {
  const order = orders.find(o => o.id === 'topping-three')
  const toppings = [{kind:'cream'}, {kind:'banana'}, {kind:'strawberry'}]
  assert.equal(evaluate(order, [piece('shortcake', 3, 4, toppings)]).correct, true)
  assert.equal(evaluate(order, [piece('shortcake', 1, 2, toppings)]).correct, false)
  assert.equal(evaluate(order, [piece('shortcake', 3, 4, toppings.slice(1))]).correct, false)
})
test('既存の単一ケーキ注文の量・種類判定を保持する', () => {
  const order = orders.find(o => o.id === 'half')
  assert.equal(evaluate(order, [piece('shortcake',1,2)]).correct, true)
  assert.equal(evaluate(order, [piece('chocolate',1,2)]).correct, false)
  assert.equal(evaluate(order, []).correct, false)
})
test('全ステージの注文IDが実在し、追加ステージを含めて一意', () => {
  assert.equal(stages.length, 8)
  assert.equal(new Set(stages.map(s => s.id)).size, stages.length)
  for (const stage of stages) for (const id of stage.orderIds) assert.ok(orders.some(o => o.id === id), id)
})
test('adminは末尾の専用パスだけで有効になる', () => {
  for (const path of ['/admin', '/admin/', '/cake/admin', '/games/cake/admin/']) assert.equal(isAdminPath(path), true)
  for (const path of ['/', '/cake/', '/administrator', '/admin/cake', '/cake']) assert.equal(isAdminPath(path), false)
})

const { createToppingLayout, drawToppingOrder } = await importTs(new URL('../src/data/toppingChallenge.ts', import.meta.url))
const { createWholeCakePiece, cutCakePieces } = await importTs(new URL('../src/utils/cakeGeometry.ts', import.meta.url))
const { findSolution } = await import('./topping-solution.mjs')
test('10種類×50配置を実際のガイドと販売判定で解ける', () => {
  const challenges = orders.filter(o => o.toppingRequest)
  assert.equal(challenges.length, 11)
  for (const order of challenges) for (let seed=1; seed<=50; seed++) {
    const toppings = createToppingLayout(order, seed * 7919)
    const {cells,cuts} = findSolution(order, toppings)
    const pieces = cutCakePieces([createWholeCakePiece()], cuts, toppings, 1)
      .filter(p=>cells[Math.floor((p.startAngle+0.01)%360/30)])
      .map(p=>({...p, toppings:toppings.filter(t=>{
        const angle=t.angle<p.startAngle?t.angle+360:t.angle
        return angle>=p.startAngle && angle<=p.endAngle
      })}))
    assert.ok(pieces.length<=3)
    assert.equal(evaluate(order,pieces).correct,true,order.id+' seed '+seed)
    const damaged = pieces.map(p=>({...p,cutToppingIds:['damaged']}))
    assert.equal(evaluate(order,damaged).correct,false)
  }
})
test('配置はシードで固定され、注文ごとに変化する', () => {
  const order=orders.find(o=>o.id==='topping-strawberry')
  assert.deepEqual(createToppingLayout(order,123),createToppingLayout(order,123))
  const layouts = new Set(Array.from({length:30},(_,i)=>JSON.stringify(createToppingLayout(order,i+1))))
  assert.ok(layouts.size>25)
})
test('一巡するまで10注文が重複せず、巡回の境目も連続しない', () => {
  const ids=orders.filter(o=>o.toppingRequest).map(o=>o.id), seen=[]
  let previous
  for(let round=0;round<3;round++) {
    const drawn=[]
    for(let i=0;i<ids.length;i++) {
      const id=drawToppingOrder(ids,seen,()=>0.3)
      assert.notEqual(id,previous);previous=id;drawn.push(id)
    }
    assert.equal(new Set(drawn).size,ids.length)
  }
})

const { getToppingFeedback } = await importTs(new URL('../src/data/toppingFeedback.ts', import.meta.url))
test('5/12が正しくクリームの代わりにバナナがある場合、量は肯定し不足と余分を伝える', () => {
  const order = orders.find(o => o.id === 'topping-strawberry-cream')
  const feedback = getToppingFeedback(order, [piece('shortcake', 5, 12, [{kind:'strawberry'}, {kind:'banana'}])], 'shortcake', [])
  assert.equal(feedback.title, '量はぴったり！ (5/12)')
  assert.ok(feedback.detail.includes('クリームが1つ足りないよ。'))
  assert.ok(feedback.detail.includes('バナナが1つ多いよ。'))
  assert.ok(!feedback.detail.includes('切って'))
})
test('個数指定の不足と量の不足を両方伝える', () => {
  const order = orders.find(o => o.id === 'topping-three')
  const feedback = getToppingFeedback(order, [piece('shortcake', 1, 2, [{kind:'cream'}])], 'shortcake', [])
  assert.ok(!feedback.title.includes('ぴったり'))
  assert.ok(feedback.detail.includes('今1/2、注文は3/4'))
  assert.ok(feedback.detail.includes('トッピングが2つ足りない'))
})
test('種類と数が合っていても傷ついたトッピング名を伝える', () => {
  const order = orders.find(o => o.id === 'topping-strawberry')
  const served = piece('shortcake', 1, 2, [{kind:'strawberry'}, {kind:'strawberry'}])
  served.cutToppingIds = ['cut-cream']
  const feedback = getToppingFeedback(order, [served], 'shortcake', [{id:'cut-cream',kind:'cream'}])
  assert.ok(feedback.title.includes('ぴったり'))
  assert.equal(feedback.detail, 'クリームを切ってしまっているよ。')
})

const { drawMasterOrder, getOrderCategory } = await importTs(new URL('../src/data/masterOrders.ts', import.meta.url))
const { getUnlockedStageIndex, stageOrderVersion } = await importTs(new URL('../src/utils/stageProgress.ts', import.meta.url))
test('新しい順番・販売人数とステージ4でのチョコ解放を定義する', () => {
  assert.deepEqual(stages.map(s=>s.id), ['basic-pieces','thirds-and-sixths','topping-orders','mixed-recipes','piece-count-challenge','random-piece-count-challenge','two-cake-orders','cake-master-final'])
  assert.deepEqual(stages.map(s=>s.targetServes), [3,4,5,5,5,6,5,10])
  assert.ok(stages.slice(0,4).every(s=>!s.requiredUnlockedCakeId))
  assert.equal(stages[4].requiredUnlockedCakeId, 'chocolate')
  assert.ok(stages[2].orderIds.every(id=>orders.find(o=>o.id===id).difficulty<4))
})
test('総合ステージは6種類の課題を一巡するまで重複なく出す', () => {
  const pool=orders.filter(o=>stages[7].orderIds.includes(o.id)), seen=[]
  for(let round=0;round<2;round++) {
    const categories=[]
    for(let i=0;i<6;i++) {
      const id=drawMasterOrder(pool,seen,undefined,()=>0.4)
      categories.push(getOrderCategory(orders.find(o=>o.id===id)))
    }
    assert.equal(new Set(categories).size,6)
  }
})
test('以前の解放済みステージを維持し、旧マスターのクリアで新最終試験をクリア扱いにしない', () => {
  assert.equal(getUnlockedStageIndex(stages,2,[],null),3)
  assert.equal(getUnlockedStageIndex(stages,3,['basic-pieces','thirds-and-sixths','mixed-recipes','cake-master'],null),4)
  assert.equal(getUnlockedStageIndex(stages,7,[],null),6)
  assert.equal(getUnlockedStageIndex(stages,7,[],stageOrderVersion),7)
  assert.equal(getUnlockedStageIndex(stages,0,['two-cake-orders'],null),7)
})
