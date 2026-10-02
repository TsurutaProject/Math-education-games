import type { Op, Shooter, Variant } from './types';

/** すべてのイベントに付く項目。個人情報は入れない。 */
export interface LogContext {
  variant: Variant;
  /** A は tap。B・C は射撃タイプ */
  shooter: 'tap' | Shooter;
  stage: number;
  problemId: string;
  /** 1回の挑戦（問題の開始〜クリア/弾切れ/やり直し）を区別するランダムな id */
  attemptId: string;
}

export type LogPayload =
  | { type: 'problem_start'; reason: 'first' | 'retry' | 'another_way' | 'next' | 'switch' }
  | {
      type: 'shot';
      /** 照準の位置（フィールド左上 0,0 〜 右下 1,1） */
      aim: { x: number; y: number };
      hitTargetId: string | null;
      hitLabel: string | null;
      /** 当たり判定の倍率（1 = 補正なし） */
      assist: number;
      shotsLeftBefore: number;
      pointerType: string;
      /** 撃ったあと、残りの弾で届くか */
      reachableAfter: boolean;
      /** パチンコのときだけ：飛ばした角度（真上が0、右が+）、引っ張った長さ、飛んでいた時間、壁ではね返った回数 */
      launch?: { angleDeg: number; pull: number; flightMs: number; bounces: number };
    }
  | {
      type: 'value_change';
      op: Op;
      value: number;
      before: number;
      after: number;
      shotsLeft: number;
      reachable: boolean;
    }
  | { type: 'clear'; key: string; expression: string; isNew: boolean; shotsLeft: number; foundCount: number; totalCount: number }
  | { type: 'out_of_shots'; current: number; goal: number; diff: number }
  | { type: 'restart'; current: number; shotsLeft: number };

export type LogEvent = { t: string } & LogContext & LogPayload;

export function makeEvent(ctx: LogContext, payload: LogPayload, now: Date = new Date()): LogEvent {
  return { t: now.toISOString(), ...ctx, ...payload };
}

/** ダウンロード用の JSON 文字列。 */
export function exportLog(events: ReadonlyArray<LogEvent>, now: Date = new Date()): string {
  return JSON.stringify({ exportedAt: now.toISOString(), count: events.length, events }, null, 2);
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
