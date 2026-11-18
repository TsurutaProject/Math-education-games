import { readFileSync } from 'node:fs'
import ts from 'typescript'
// Load real TS modules (including their relative dependencies) without emitting files.
export function moduleUrl(url) {
  const source = readFileSync(url, 'utf8')
  let { outputText } = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
  } })
  outputText = outputText.replace(/from ['"](\.[^'"]+)['"]/g, (_match, path) =>
    `from '${moduleUrl(new URL(path + '.ts', url))}'`)
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
}
export const importTs = url => import(moduleUrl(url))
