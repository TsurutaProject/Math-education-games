import { summarizeAttempts } from '../logic/attempts';
import {
  exportLog,
  makeEvent,
  randomId,
  type LogBody,
  type LogContext,
  type LogEvent,
  type LogPayload,
  type SessionPayload,
  LOG_STORAGE_ESTIMATE,
  storageLevel,
  type StorageLevel,
} from '../logic/log';
import { ALL_PROBLEMS } from '../logic/problems';

const KEY = 'shateki-log-v1';
/** パソコン（ブラウザ）ごとの id。ログを消しても変えない（複数台のログをまとめたときに区別するため） */
const DEVICE_KEY = 'shateki-device-v1';
/** いま遊んでいる人の id。再読み込みでは変えず、「つぎの人へ」でだけ変える */
const PLAYER_KEY = 'shateki-player-v1';

/** 保存しているログの文字数（保存の量の目安に使う） */
let storedChars = 0;
/** 最後の保存に失敗したか（容量不足など） */
let saveFailed = false;
let events: LogEvent[] = load();
const listeners = new Set<() => void>();

/** ページを開くごとの id と、その中の通し番号 */
const sessionId = randomId();
let seq = 0;
const deviceId = loadOrCreateId(DEVICE_KEY).id;
let player = loadOrCreateId(PLAYER_KEY);
let sessionStarted = false;

// 同じゲームをほかのタブでも開いていると、それぞれが自分の覚えている分だけで保存し直して、相手の分を消してしまう。
// ほかのタブが保存したら読み直して、上書きで消さないようにする（ほぼ同時に保存したときまでは防げない）
window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  try {
    events = e.newValue ? (JSON.parse(e.newValue) as LogEvent[]) : [];
    storedChars = e.newValue?.length ?? 0;
  } catch {
    return;
  }
  listeners.forEach((l) => l());
});

function load(): LogEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    storedChars = raw?.length ?? 0;
    return raw ? (JSON.parse(raw) as LogEvent[]) : [];
  } catch {
    return [];
  }
}

/** 保存してある id を読む。なければ作って保存する（created = 新しく作った） */
function loadOrCreateId(key: string): { id: string; created: boolean } {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return { id: saved, created: false };
  } catch {
    // 読めなくても、新しい id で続ける
  }
  const id = randomId();
  saveId(key, id);
  return { id, created: true };
}

function saveId(key: string, id: string) {
  try {
    localStorage.setItem(key, id);
  } catch {
    // 保存できなくても、この起動の間はメモリ上の id を使う
  }
}

function persist() {
  const raw = JSON.stringify(events);
  try {
    localStorage.setItem(KEY, raw);
    storedChars = raw.length;
    saveFailed = false;
  } catch {
    // 容量不足などでもゲームは止めない（メモリ上には残るので、画面を閉じる前ならダウンロードできる）
    saveFailed = true;
  }
  listeners.forEach((l) => l());
}

function push(body: LogBody) {
  seq += 1;
  events = [...events, makeEvent({ sessionId, seq }, body)];
  persist();
}

/** 遊びのイベント（1回の挑戦の中）を記録する */
export function logEvent(ctx: LogContext, payload: LogPayload): void {
  push({ ...ctx, ...payload });
}

/** 遊びの外のイベント（起動・人の切り替え・設定）を、いまの人の id で記録する */
export function logSessionEvent(payload: SessionPayload): void {
  push({ playerId: player.id, ...payload });
}

export function currentPlayerId(): string {
  return player.id;
}

/**
 * 起動を記録する（ページを開いたときに1回だけ。画面を描く前に呼ぶ）。
 * このパソコンで初めて開いたときは、新しい人として player_start も残す。
 */
export function startSession(mode: 'exhibit' | 'dev', settings: object): void {
  if (sessionStarted) return;
  sessionStarted = true;
  logSessionEvent({ type: 'session_start', deviceId, mode, settings });
  if (player.created) logSessionEvent({ type: 'player_start', reason: 'first' });
}

/** 「つぎの人へ」：新しい人の id に替えて記録する。新しい id を返す */
export function nextPlayer(): string {
  player = { id: randomId(), created: true };
  saveId(PLAYER_KEY, player.id);
  logSessionEvent({ type: 'player_start', reason: 'next_player' });
  return player.id;
}

/** 人ごと・問題ごとの挑戦の回数。この起動の間だけ数える（再読み込みすると 1 から数え直す） */
const attemptCounts = new Map<string, number>();

/** その人がその問題（key）に挑戦するのが何回目か。呼ぶたびに 1 増える */
export function nextAttemptNo(playerId: string, key: string): number {
  const k = `${playerId}:${key}`;
  const n = (attemptCounts.get(k) ?? 0) + 1;
  attemptCounts.set(k, n);
  return n;
}

export function getLogCount(): number {
  return events.length;
}

/** 保存の量（目安に対する割合、0〜） */
export function getLogUsage(): number {
  return storedChars / LOG_STORAGE_ESTIMATE;
}

/** 保存の状態（いっぱいに近い・失敗したら、スタッフに知らせる） */
export function getLogLevel(): StorageLevel {
  return storageLevel(storedChars, saveFailed);
}

export function subscribeLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearLog(): void {
  events = [];
  persist();
}

export function downloadLog(): void {
  const now = new Date();
  const goalOf = (id: string) => ALL_PROBLEMS.find((p) => p.id === id)?.goal ?? null;
  const attempts = summarizeAttempts(events, { deviceId, goalOf });
  const blob = new Blob([exportLog(events, { deviceId, attempts }, now)], { type: 'application/json' });
  const a = document.createElement('a');
  const pad = (n: number) => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `shateki-log-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
