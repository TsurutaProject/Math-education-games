import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Run App's real event handlers and geometry. Presentational children are
// inspected as element records; the hook harness explicitly rerenders after actions.
let slots = [], cursor = 0
const hooks = {
  useState(initial) {
    const i = cursor++
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
    return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }]
  },
  useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
  useMemo(fn) { return fn() },
  useEffect() {},
}
globalThis.__cakeTestHooks = hooks
globalThis.window = {
  location: { pathname: '/admin' },
  localStorage: { getItem() { assert.fail('admin read player data') }, setItem() { assert.fail('admin wrote player data') } },
  setTimeout() {},
}
const toUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
const cache = new Map()
function load(url) {
  if (cache.has(url.href)) return cache.get(url.href)
  let source = readFileSync(url, 'utf8')
  // Node has no Vite environment; use the default development configuration.
  source = source.replace(/import\.meta\.env/g, '({})')
  source = source.replace(/import ['"][^'"]+\.css['"];?/g, '')
  let { outputText } = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React,
  } })
  outputText = outputText.replace(/import ([\s\S]*?) from ['"]([^'"]+)['"];?/g, (match, bindings, path) => {
    if (path === 'react') return `const ${bindings} = globalThis.__cakeTestHooks;`
    if (path.startsWith('./components/')) return bindings.replace(/[{}]/g, '').split(',').filter(n => n.trim()).map(n => `const ${n.trim()} = '${n.trim()}';`).join('\n')
    if (path === './hooks/useSoundEffects') return 'const useSoundEffects = () => () => {};'
    if (/\.(png|jpg|mp3)$/.test(path)) return `const ${bindings} = ${JSON.stringify(path)};`
    if (path.startsWith('.')) return `import ${bindings} from '${load(new URL(path + '.ts', url))}';`
    return match
  })
  outputText = 'const React = { Fragment: "fragment", createElement: (type, props, ...children) => ({type, props: {...props, children}}) };\n' + outputText
  const result = toUrl(outputText); cache.set(url.href, result); return result
}
const { default: App } = await import(load(new URL('../src/App.tsx', import.meta.url))).catch(error => { throw new Error(error.message) })
function setup(stage) {
  slots = []; let tree
  const render = () => { cursor = 0; tree = App() }
  const all = () => {
    const nodes = []
    const walk = value => { if (Array.isArray(value)) return value.forEach(walk); if (value?.props) { nodes.push(value); walk(value.props.children) } }
    walk(tree); return nodes
  }
  const find = type => all().find(n => n.type === type)?.props
  const act = fn => { fn(); render() }
  const serve = () => all().find(n => n.props.className?.includes('serve-button'))?.props
  render()
  assert.equal(find('StageSelectScreen').maxUnlockedStage, 7)
  assert.equal(find('LogExport'), undefined)
  act(() => find('StageSelectScreen').onSelectStage(stage))
  assert.equal(find('GuidedTutorial').step, null)
  return { find, act, serve }
}
function cutAndMove(h, angle) {
  h.act(() => h.find('CakeBoard').onCutCake(12, [0, angle]))
  const piece = h.find('CakeBoard').pieces.find(p => p.startAngle === 0 && p.endAngle === angle)
  assert.ok(piece)
  h.act(() => h.find('CakeBoard').onMovePieceToTray(piece))
}
test('2種類のトレー・まな板を切替と返却で保持して販売できる', () => {
  const h = setup(6)
  cutAndMove(h, 90)
  const shortPiece = h.find('Tray').selectedPieces[0]
  h.act(() => h.find('CakeSelector').onSelectCake('chocolate'))
  assert.equal(h.find('Tray').selectedPieces[0], shortPiece)
  cutAndMove(h, 120)
  assert.equal(h.find('Tray').selectedPieces.length, 2)
  assert.equal(new Set(h.find('Tray').selectedPieces.map(p => p.id)).size, 2)
  assert.ok(h.serve().className.includes('is-ready'))
  h.act(() => h.find('CakeSelector').onSelectCake('shortcake'))
  assert.equal(h.find('CakeBoard').pieces.length, 1)
  const chocolate = h.find('Tray').selectedPieces.find(p => p.cakeKind === 'chocolate')
  h.act(() => h.find('Tray').onRemovePiece(chocolate))
  assert.equal(h.find('CakeBoard').pieces.length, 1)
  h.act(() => h.find('CakeSelector').onSelectCake('chocolate'))
  assert.equal(h.find('CakeBoard').pieces.length, 2)
  h.act(() => h.find('CakeBoard').onMovePieceToTray(chocolate))
  assert.ok(h.serve().className.includes('is-ready'))
  h.act(() => h.serve().onClick())
  assert.equal(h.find('ResultMessage').result.combo, 1)
  assert.equal(h.find('Tray').selectedPieces.length, 0)
  h.act(() => h.find('CakeSelector').onSelectCake('shortcake'))
  assert.equal(h.find('CakeBoard').pieces.length, 1)
  assert.equal(h.find('CakeBoard').pieces[0].fraction.numerator, 1)
  assert.equal(h.find('CakeBoard').pieces[0].fraction.denominator, 1)
})
test('途中のチュートリアル後も、表示中でなかったケーキの状態を復元', () => {
  const h = setup(6)
  cutAndMove(h, 90)
  h.act(() => h.find('CakeSelector').onSelectCake('chocolate'))
  h.act(() => h.find('HelpMenu').onOpenTutorial())
  for (let i = 0; i < 3; i++) h.act(() => h.find('GuidedTutorial').onAdvance())
  cutAndMove(h, 180)
  h.act(() => h.find('GameControls').onChangeInteractionMode('move'))
  // Set the guided transfer step by returning and moving its example piece.
  const example = h.find('Tray').selectedPieces[0]
  h.act(() => h.find('Tray').onRemovePiece(example))
  h.act(() => h.find('CakeBoard').onMovePieceToTray(example))
  h.act(() => h.serve().onClick())
  assert.equal(h.find('GuidedTutorial').step, 'combo')
  h.act(() => h.find('GuidedTutorial').onSkip())
  h.act(() => h.find('CakeSelector').onSelectCake('shortcake'))
  assert.equal(h.find('CakeBoard').pieces.length, 1)
  assert.equal(h.find('CakeBoard').pieces[0].fraction.numerator / h.find('CakeBoard').pieces[0].fraction.denominator, 3 / 4)
  assert.equal(h.find('Tray').selectedPieces.length, 1)
})
const { findSolution } = await import('./topping-solution.mjs')
test('ランダムなトッピングを切らずに分け、返却しても保持して販売できる', () => {
  const h = setup(2)
  assert.equal(h.find('CakeSelector'), undefined)
  assert.equal(h.find('ToppingControls'), undefined)
  const toppings=h.find('CakeBoard').toppings
  const {cells,cuts}=findSolution(h.find('OrderBubble').order,toppings)
  h.act(()=>h.find('CakeBoard').onCutCake(12,cuts))
  const selected=h.find('CakeBoard').pieces.filter(p=>cells[Math.floor((p.startAngle+0.01)%360/30)])
  for(const p of selected) h.act(()=>h.find('CakeBoard').onMovePieceToTray(p))
  const piece=h.find('Tray').selectedPieces[0]
  h.act(()=>h.find('Tray').onRemovePiece(piece))
  h.act(()=>h.find('CakeBoard').onMovePieceToTray(piece))
  assert.deepEqual(h.find('Tray').selectedPieces.find(p=>p.id===piece.id).toppings,piece.toppings)
  assert.ok(h.serve().className.includes('is-ready'))
  h.act(()=>h.serve().onClick())
  assert.equal(h.find('ResultMessage').result.combo,1)
  assert.equal(h.find('Tray').selectedPieces.length,0)
  assert.notDeepEqual(h.find('CakeBoard').toppings,toppings)
})

test('総合ステージで全6課題を続けて販売し、注文と配置が正常に切り替わる', () => {
  const h=setup(7), categories=new Set()
  for(let i=0;i<6;i++) {
    const order=h.find('OrderBubble').order
    categories.add(order.items?'two':order.toppingRequest?'topping':order.id.includes('random-piece-count')?'random':order.perfectPieceCount?'count':order.recipePieces?'recipe':'basic')
    if(order.items) {
      for(const item of order.items) {
        h.act(()=>h.find('CakeSelector').onSelectCake(item.cakeKind))
        cutAndMove(h,item.target.numerator/item.target.denominator*360)
      }
    } else {
      h.act(()=>h.find('CakeSelector').onSelectCake(order.cakeKind))
      if(order.toppingRequest) {
        const {cells,cuts}=findSolution(order,h.find('CakeBoard').toppings)
        h.act(()=>h.find('CakeBoard').onCutCake(12,cuts))
        const selected=h.find('CakeBoard').pieces.filter(p=>cells[Math.floor((p.startAngle+0.01)%360/30)])
        for(const p of selected) h.act(()=>h.find('CakeBoard').onMovePieceToTray(p))
      } else cutAndMove(h,order.target.numerator/order.target.denominator*360)
    }
    h.act(()=>h.serve().onClick())
    if(h.find('ResultMessage').result.kind==='warning') h.act(()=>h.find('ResultMessage').onConfirm())
    assert.equal(h.find('ResultMessage').result.combo,i+1)
    h.act(()=>h.find('ResultMessage').onDismiss())
  }
  assert.equal(categories.size,6)
})
