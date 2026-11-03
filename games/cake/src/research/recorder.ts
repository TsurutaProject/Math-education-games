import type { Order, Stage, TrophyDefinition, TrophyProgress } from '../types/game'

export const LOG_KEY = 'cake-game:research-v1'
type Data = Record<string, unknown>
interface Event { id: number; at: string; sessionId: string; stageRunId?: string; orderRunId?: string; type: string; data: Data }
interface StageRun {
  id: string; stageId: string; title: string; startedAt: string; endedAt?: string
  baselineServes: number; target: number; replay: boolean; ready: boolean
  activeMs: number; clearMs?: number; cleared: boolean; hints: number; resets: number; sales: number
  maxCombo: number; visits: number; reset?: boolean
}
interface OrderRun {
  id: string; stageRunId: string; sessionId: string; order: Order; startedAt: string; endedAt?: string
  activeMs: number; hints: number; resets: number; attempts: number; status: 'unfinished' | 'sold' | 'interrupted'
  recipeMatched?: boolean; pieceCountMatched?: boolean
}
interface Log {
  schemaVersion: 1; appVersion: string; playerId: string; createdAt: string
  events: Event[]; stages: StageRun[]; orders: OrderRun[]
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
const iso = () => new Date().toISOString()
// randomUUID is unavailable on HTTP LAN URLs used in classroom playtests.
const uid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Explicit action recording avoids duplicate events from React StrictMode renders.
export class ResearchRecorder {
  log: Log
  sessionId = uid()
  storageError = ''
  private storage: StorageLike
  private now: () => number
  private last: number
  private running = false
  private stage?: StageRun
  private order?: OrderRun
  private tutorial = false
  private progressSignature = ''
  private snapshots = new Map<string, string>()

  constructor(storage: StorageLike, now = () => performance.now()) {
    this.storage = storage
    this.now = now
    this.last = now()
    this.log = { schemaVersion: 1, appVersion: 'cake-research-1', playerId: uid(), createdAt: iso(), events: [], stages: [], orders: [] }
    try {
      const saved = storage.getItem(LOG_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Log
        if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.events) || !Array.isArray(parsed.stages) || !Array.isArray(parsed.orders)) throw Error('形式が不正です')
        this.log = parsed
        this.log.orders.filter(o => o.status === 'unfinished').forEach(o => { o.status = 'interrupted'; o.endedAt = iso() })
      }
    } catch {
      this.storageError = '以前のログを読み込めませんでした。今回の記録は書き出せます。'
      // Preserve the unreadable original instead of silently overwriting it.
      this.storage = { getItem: () => null, setItem: () => { throw Error('Unreadable original preserved') } }
    }
    this.event('session_start', { recovered: this.log.events.length > 0 })
  }

  checkpoint() {
    const time = this.now()
    const delta = Math.max(0, time - this.last)
    if (this.running && this.stage?.ready) {
      this.stage.activeMs += delta
      if (this.order) this.order.activeMs += delta
    }
    this.last = time
  }
  save() {
    this.checkpoint()
    try { this.storage.setItem(LOG_KEY, JSON.stringify(this.log)); this.storageError = '' }
    catch { this.storageError = 'ブラウザーへの保存に失敗しています。画面を閉じる前にログを書き出してください。' }
  }
  event(type: string, data: Data = {}) {
    this.checkpoint()
    this.log.events.push({ id: this.log.events.length + 1, at: iso(), sessionId: this.sessionId, stageRunId: this.stage?.id, orderRunId: this.order?.id, type, data: { ...data, tutorial: this.tutorial } })
    this.save()
  }
  snapshot(type: string, data: Data) {
    const signature = JSON.stringify(data)
    if (this.snapshots.get(type) === signature) return
    this.snapshots.set(type, signature)
    this.event(type, data)
  }
  enter(stage: Stage, baseline: number, replay: boolean, initialTutorial: boolean) {
    this.leave('stage_change')
    this.stage = !replay ? this.log.stages.findLast(s => s.stageId === stage.id && !s.cleared && !s.replay && !s.reset) : undefined
    if (!this.stage) {
      this.stage = { id: uid(), stageId: stage.id, title: stage.title, startedAt: iso(), baselineServes: baseline, target: stage.targetServes, replay, ready: !initialTutorial, activeMs: 0, cleared: false, hints: 0, resets: 0, sales: 0, maxCombo: 0, visits: 0 }
      this.log.stages.push(this.stage)
    }
    this.stage.visits++
    this.tutorial = initialTutorial
    this.event('stage_enter', { baseline, replay, initialTutorial })
    if (initialTutorial) this.event('tutorial_start', { initial: true })
  }
  leave(reason: string) {
    if (!this.stage) return
    this.interruptOrder(reason)
    this.event('stage_leave', { reason })
    this.running = false
    this.stage = undefined
    this.tutorial = false
  }
  resetAll() {
    // Clear memory too: pagehide/interval saves must never restore the old log.
    this.running = false
    this.stage = undefined
    this.order = undefined
    this.tutorial = false
    this.progressSignature = ''
    this.snapshots.clear()
    this.last = this.now()
    this.sessionId = uid()
    this.log = { schemaVersion: 1, appVersion: 'cake-research-1', playerId: uid(), createdAt: iso(), events: [], stages: [], orders: [] }
    this.save()
    if (this.storageError) throw Error(this.storageError)
  }
  tutorialStart() { this.setRunning(false, 'tutorial'); this.tutorial = true; this.event('tutorial_start', { initial: false }) }
  tutorialEnd(reason: string, initial: boolean) {
    this.event('tutorial_end', { reason, initial })
    this.tutorial = false
    if (initial && this.stage) { this.stage.ready = true; this.event('measurement_start', { reason }) }
  }
  setRunning(value: boolean, reason: string) {
    const next = value && !!this.stage?.ready && !this.tutorial
    if (this.running === next) return
    this.checkpoint()
    this.running = next
    this.event(next ? 'timer_resume' : 'timer_pause', { reason })
  }
  ensureOrder(order: Order) {
    if (!this.stage || this.tutorial || !this.stage.ready || this.order) return
    this.order = { id: uid(), stageRunId: this.stage.id, sessionId: this.sessionId, order: structuredClone(order), startedAt: iso(), activeMs: 0, hints: 0, resets: 0, attempts: 0, status: 'unfinished' }
    this.log.orders.push(this.order)
    this.event('order_start', { order })
  }
  interruptOrder(reason: string) {
    if (!this.order) return
    this.event('order_interrupted', { reason })
    this.order.status = 'interrupted'; this.order.endedAt = iso(); this.order = undefined
    this.save()
  }
  action(type: string, data: Data = {}) {
    if (!this.tutorial) {
      if (type === 'hint_open') { if (this.stage) this.stage.hints++; if (this.order) this.order.hints++ }
      if (type === 'reset') { if (this.stage) this.stage.resets++; if (this.order) this.order.resets++ }
      if (type === 'submit' && this.order) this.order.attempts++
    }
    this.event(type, data)
  }
  sold(data: Data & { combo: number; recipeMatched: boolean; pieceCountMatched: boolean }) {
    this.event('sale', data)
    if (this.order) { Object.assign(this.order, { status: 'sold', endedAt: iso(), recipeMatched: data.recipeMatched, pieceCountMatched: data.pieceCountMatched }); this.order = undefined }
    if (this.stage) { this.stage.sales++; this.stage.maxCombo = Math.max(this.stage.maxCombo, data.combo) }
    this.save()
  }
  clear() {
    this.checkpoint()
    if (this.stage && !this.stage.cleared) {
      this.stage.cleared = true; this.stage.clearMs = this.stage.activeMs; this.stage.endedAt = iso()
      this.event('stage_clear', { activeMs: this.stage.clearMs })
    }
    this.setRunning(false, 'stage_clear')
  }
  trophies(progress: TrophyProgress, definitions: TrophyDefinition[]) {
    const signature = JSON.stringify(progress)
    if (signature === this.progressSignature) return
    this.progressSignature = signature
    this.event('trophy_progress', { trophies: definitions.map(t => ({ ...t, progress: progress[t.metric], acquired: progress[t.metric] >= t.target })), acquiredCount: definitions.filter(t => progress[t.metric] >= t.target).length })
  }
  export(format: 'json' | 'stages' | 'orders') {
    this.save()
    if (format === 'json') return JSON.stringify({ ...this.log, exportedAt: iso(), storageError: this.storageError, totalHints: this.log.stages.reduce((n, s) => n + s.hints, 0) }, null, 2)
    const rows = format === 'stages'
      ? this.log.stages.map(s => ({ playerId: this.log.playerId, ...s, status: s.cleared ? 'cleared' : s.reset ? 'reset' : 'unfinished', clearSeconds: s.clearMs === undefined ? '' : s.clearMs / 1000, activeSeconds: s.activeMs / 1000, totalHints: this.log.stages.reduce((n, v) => n + v.hints, 0) }))
      : this.log.orders.map(o => ({
        playerId: this.log.playerId, ...o, order: JSON.stringify(o.order), activeSeconds: o.activeMs / 1000,
        stageId: this.log.stages.find(s => s.id === o.stageRunId)?.stageId,
        orderId: o.order.id, cakeKind: o.order.cakeKind,
        target: `${o.order.target.numerator}/${o.order.target.denominator}`,
        recipeRequired: o.order.recipePieces !== undefined,
        recipe: o.order.recipePieces?.map(p => `${p.numerator}/${p.denominator}`).join('+') ?? '',
        perfectPieceCount: o.order.perfectPieceCount ?? '',
      }))
    return toCsv(rows, format === 'stages'
      ? ['playerId', 'id', 'stageId', 'title', 'status', 'baselineServes', 'target', 'replay', 'ready', 'activeSeconds', 'clearSeconds', 'hints', 'resets', 'sales', 'maxCombo', 'visits', 'totalHints', 'startedAt', 'endedAt']
      : ['playerId', 'id', 'stageRunId', 'sessionId', 'stageId', 'orderId', 'cakeKind', 'target', 'status', 'activeSeconds', 'hints', 'resets', 'attempts', 'recipeRequired', 'recipe', 'recipeMatched', 'perfectPieceCount', 'pieceCountMatched', 'startedAt', 'endedAt', 'order'])
  }
}

export function toCsv(rows: object[], columns?: string[]) {
  const keys = columns ?? [...new Set(rows.flatMap(row => Object.keys(row)))]
  const cell = (value: unknown) => {
    let s = value === undefined || value === null ? '' : String(value)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return '"' + s.replaceAll('"', '""') + '"'
  }
  return '\uFEFF' + [keys.map(cell).join(','), ...rows.map(row => keys.map(key => cell((row as Data)[key])).join(','))].join('\r\n')
}
let recorder: ResearchRecorder | undefined
export function getResearch() {
  if (!recorder) {
    let storage: StorageLike
    try { storage = window.localStorage } catch { storage = { getItem: () => null, setItem: () => { throw Error('Storage disabled') } } }
    recorder = new ResearchRecorder(storage)
  }
  return recorder
}
