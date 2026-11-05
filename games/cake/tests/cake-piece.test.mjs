import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
// Exercise the real pointer handlers with a minimal hook/DOM harness.
let source=readFileSync(new URL('../src/components/CakePiece.tsx',import.meta.url),'utf8')
source=source.replace(/import .* from 'react'/, 'const useRef = value => ({ current: value }); const useEffect = callback => { callback() };')
source=source.replace(/import .* from '..\/utils\/cakeGeometry'/, 'const describeCakeSlice = () => ""')
source='const React = { createElement: (type, props, ...children) => ({type,props:{...props,children}}) };\n'+source
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}})
const {CakePiece}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
function setup(target, bounds) {
 const documentEvents=new Map(),windowEvents=new Map();let moved=0,carried=null
 globalThis.document={querySelector:()=>bounds ? {getBoundingClientRect:()=>bounds} : null,hidden:false,elementFromPoint:()=>target,addEventListener:(n,f)=>documentEvents.set(n,f),removeEventListener:n=>documentEvents.delete(n)}
 globalThis.window={getSelection:()=>null,addEventListener:(n,f)=>windowEvents.set(n,f),removeEventListener:n=>windowEvents.delete(n)}
 const tree=CakePiece({piece:{startAngle:0,endAngle:180},canMove:true,isTrayFull:false,onMoveToTray:()=>moved++,onCarryPieceChange:(_p,v)=>carried=v})
 tree.props.children[0].props.onPointerDown({isPrimary:true,button:0,pointerId:1,clientX:10,clientY:10,preventDefault(){}})
 return {documentEvents,windowEvents,moved:()=>moved,carried:()=>carried}
}
test('画面外のnull落下先ではトレーへ移動しない',()=>{
 const h=setup(null);h.documentEvents.get('pointerup')({pointerId:1,clientX:-100,clientY:-100});assert.equal(h.moved(),0);assert.equal(h.carried(),null);assert.equal(h.documentEvents.size,0)
})
test('トレー以外に離しても移動しない',()=>{
 const h=setup({closest:()=>null});h.documentEvents.get('pointerup')({pointerId:1});assert.equal(h.moved(),0)
})
test('トレー内で離したときだけ一度移動する',()=>{
 const h=setup({closest:()=>({})});h.documentEvents.get('pointerup')({pointerId:1});assert.equal(h.moved(),1);assert.equal(h.documentEvents.size,0)
})
test('ウィンドウから離れたら解除し、自動的に移動しない',()=>{
 const h=setup({closest:()=>({})});h.windowEvents.get('blur')();assert.equal(h.moved(),0);assert.equal(h.carried(),null);assert.equal(h.documentEvents.size,0)
})
test('別の指のpointerupでは操作を終了しない',()=>{
 const h=setup({closest:()=>({})});h.documentEvents.get('pointerup')({pointerId:2});assert.equal(h.moved(),0);assert.notEqual(h.carried(),null);h.documentEvents.get('pointercancel')({pointerId:1});assert.equal(h.carried(),null)
})
test('画面外で離して戻った場合も運び中の表示を解除',()=>{
 const h=setup(null);h.documentEvents.get('pointermove')({pointerId:1,buttons:0});assert.equal(h.carried(),null);assert.equal(h.moved(),0)
})

test('トレーの縁から少し外側でも置ける',()=>{
 const bounds={left:100,right:500,top:100,bottom:400}
 for (const [clientX,clientY] of [[75,200],[525,200],[200,75],[200,425],[36,200],[564,200],[200,36],[200,464]]) {
  const h=setup({closest:()=>null},bounds)
  h.documentEvents.get('pointerup')({pointerId:1,clientX,clientY});assert.equal(h.moved(),1)
 }
})
test('トレーから離れた場所・画面外・隣のボタンには置かない',()=>{
 const bounds={left:100,right:500,top:100,bottom:400}
 for (const [target,clientX,clientY] of [[{closest:()=>null},35,200],[null,75,200],[{closest:s=>s==='button'?{}:null},200,425]]) {
  const h=setup(target,bounds)
  h.documentEvents.get('pointerup')({pointerId:1,clientX,clientY});assert.equal(h.moved(),0)
 }
})
