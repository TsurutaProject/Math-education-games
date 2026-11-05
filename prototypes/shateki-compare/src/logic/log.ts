import type { Op, Shooter, Variant } from './types';

/**
 * ログの形の版。ダウンロードするファイルに入れる。
 * 2：起動ごとの sessionId・人ごとの playerId・通し番号 seq を足した（issue #20）。これらがないイベントは版 1。
 */
export const LOG_SCHEMA_VERSION = 2;

/** 遊びのイベント（1回の挑戦の中で起きること）に付く項目。個人情報は入れない。 */
export interface LogContext {
  /** 遊んでいる人ごとのランダムな id。スタッフ用パネルの「つぎの人へ」でだけ変わる（再読み込みでは変わらない） */
  playerId: string;
  variant: Variant;
  /** A は tap。B・C は射撃タイプ */
  shooter: 'tap' | Shooter;
  stage: number;
  problemId: string;
  /** 1回の挑戦（問題の開始〜クリア/弾切れ/やり直し）を区別するランダムな id */
  attemptId: string;
}

export type LogPayload =
  | { type: 'problem_start'; reason: 'first' | 'retry' | 'another_way' | 'next' | 'switch' | 'next_player' }
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
      /**
       * パチンコ・カタパルトのときだけ：飛ばした角度（真上が0、右が+）、引っ張った長さ、飛んでいた時間。
       * パチンコは壁ではね返った回数、カタパルトは着地点（フィールド 0〜1）も入る。
       */
      launch?: { angleDeg: number; pull: number; flightMs: number; bounces?: number; landing?: { x: number; y: number } };
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
  | { type: 'restart'; current: number; shotsLeft: number }
  /** 画面が隠れた（タブを切り替えた・閉じたなど）。途中でやめたかを見るため */
  | { type: 'page_hide'; current: number; shotsLeft: number }
  /** 隠れていた画面に戻った */
  | { type: 'page_show' };

/** 遊びの外のイベント（起動・人の切り替え・設定の変更） */
export type SessionPayload =
  /** ページを開いた。deviceId はパソコン（ブラウザ）ごとの id。その時点の設定を全部残す */
  | { type: 'session_start'; deviceId: string; mode: 'exhibit' | 'dev'; settings: object }
  /** 新しい人が遊び始めた。first = このパソコンで初めて開いた、next_player = スタッフが「つぎの人へ」を押した */
  | { type: 'player_start'; reason: 'first' | 'next_player' }
  /** 設定パネルを閉じたとき、設定が変わっていれば変更後の設定を全部残す */
  | { type: 'settings_change'; settings: object };

/** イベントの中身（遊びのイベントか、遊びの外のイベント） */
export type LogBody = (LogContext & LogPayload) | ({ playerId: string } & SessionPayload);

/** すべてのイベントに付く項目：時刻、起動ごとの id、起動してからの通し番号（1から） */
export interface LogStamp {
  t: string;
  sessionId: string;
  seq: number;
}

export type LogEvent = LogStamp & LogBody;

export function makeEvent(stamp: Omit<LogStamp, 't'>, body: LogBody, now: Date = new Date()): LogEvent {
  return { t: now.toISOString(), ...stamp, ...body };
}

/** ダウンロード用の JSON 文字列。deviceId で、どのパソコンのログかわかるようにする */
export function exportLog(events: ReadonlyArray<LogEvent>, meta: { deviceId: string }, now: Date = new Date()): string {
  return JSON.stringify(
    { schemaVersion: LOG_SCHEMA_VERSION, exportedAt: now.toISOString(), deviceId: meta.deviceId, count: events.length, events },
    null,
    2,
  );
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
