import { exportLog, makeEvent, type LogContext, type LogEvent, type LogPayload } from '../logic/log';

const KEY = 'shateki-log-v1';
let events: LogEvent[] = load();
const listeners = new Set<() => void>();

function load(): LogEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LogEvent[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
  } catch {
    // 容量不足などでもゲームは止めない（メモリ上には残る）
  }
  listeners.forEach((l) => l());
}

export function logEvent(ctx: LogContext, payload: LogPayload): void {
  events = [...events, makeEvent(ctx, payload)];
  persist();
}

export function getLogCount(): number {
  return events.length;
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
  const blob = new Blob([exportLog(events, now)], { type: 'application/json' });
  const a = document.createElement('a');
  const pad = (n: number) => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `shateki-log-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
