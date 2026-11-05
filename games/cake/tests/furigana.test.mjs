import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const require=createRequire(import.meta.url)
const source=readFileSync(new URL('../src/components/FuriganaText.tsx',import.meta.url),'utf8')
let {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}})
outputText=outputText.replace(/from ["'](react(?:\/jsx-runtime)?)["']/g,(_m,name)=>`from ${JSON.stringify(pathToFileURL(require.resolve(name)).href)}`)
const {FuriganaText}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const render=text=>renderToStaticMarkup(createElement(FuriganaText,{text}))
const missingRuby=html=>{
 let depth=0;const missing=[]
 for(const token of html.match(/<[^>]+>|[^<]+/g)??[]){
  if(token.startsWith('<ruby'))depth++
  else if(token==='</ruby>')depth--
  else if(!token.startsWith('<')&&!depth&&/[一-龯]/.test(token))missing.push(token)
 }
 return missing
}
test('作り直すにルビと太い日本語の直を適用する',()=>{
 const html=render('作り直す')
 assert.ok(html.includes('<rt>つく</rt>'));assert.ok(html.includes('<rt>なお</rt>'))
 assert.ok(html.includes('class="japanese-glyph japanese-glyph--bold" lang="ja">直</span>'))
 assert.deepEqual(missingRuby(html),[])
})
test('未登録語の直にも字形補正が効く',()=>{
 assert.ok(render('直XYZ').includes('japanese-glyph--bold'))
})
test('画面・データ・保存エラーの日本語文字列に読みの抜けがない',()=>{
 const root=new URL('../src/',import.meta.url)
 const files=['App.tsx','research/recorder.ts',...readdirSync(new URL('components/',root)).filter(n=>n.endsWith('.tsx')&&n!=='FuriganaText.tsx').map(n=>'components/'+n),...readdirSync(new URL('data/',root)).filter(n=>n.endsWith('.ts')&&n!=='assets.ts').map(n=>'data/'+n)]
 for(const file of files){
  const text=readFileSync(new URL(file,root),'utf8')
  const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  function visit(node){
   if((ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))&&/[一-龯]/.test(node.text))assert.deepEqual(missingRuby(render(node.text)),[],`${file}: ${node.text}`)
   if(ts.isTemplateExpression(node)){
    const value=node.head.text+node.templateSpans.map(span=>'1'+span.literal.text).join('')
    assert.deepEqual(missingRuby(render(value)),[],`${file}: ${value}`)
   }
   if(ts.isJsxText(node))assert.ok(!/[一-龯]/.test(node.text),`${file}: raw JSX ${node.text}`)
   ts.forEachChild(node,visit)
  }
  visit(ast)
 }
})
