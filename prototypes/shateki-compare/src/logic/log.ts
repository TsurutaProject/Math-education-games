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
  | {
      type: 'problem_start';
      reason: 'first' | 'retry' | 'another_way' | 'next' | 'switch' | 'next_player';
      /** その人がその問題（射撃タイプ別）に何回目の挑戦か。再読み込みすると 1 から数え直す */
      attemptNo: number;
      /** 始めたとき、図鑑でその問題の解き方をいくつ見つけていたか */
      foundBefore: number;
    }
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
      /** 挑戦を始めてから、この1発の当たり・外れが決まるまでのミリ秒（1発目なら「最初の操作までの時間」の目安） */
      sinceStartMs: number;
      /** 押してから離すまで（狙っていた時間）のミリ秒。A（タップ）は null */
      aimMs: number | null;
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
  /** elapsedMs は挑戦を始めてからのミリ秒（画面が隠れていた時間も含む） */
  | { type: 'clear'; key: string; expression: string; isNew: boolean; shotsLeft: number; foundCount: number; totalCount: number; elapsedMs: number }
  /** 弾切れ。そのときの式と、解き方のキー（クリアと同じ形）も残す */
  | { type: 'out_of_shots'; current: number; goal: number; diff: number; expression: string; key: string; elapsedMs: number }
  /** 「さいしょから」を押した */
  | { type: 'restart'; current: number; shotsLeft: number; expression: string; elapsedMs: number }
  /** 終わる前（クリア・弾切れの前）に、1発以上撃ってから別の問題・つぎの人などに移った（途中でやめた） */
  | { type: 'attempt_leave'; current: number; shotsLeft: number; expression: string; elapsedMs: number }
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

/**
 * ブラウザに保存できるログの量の目安（文字数）。localStorage の上限は 1 つのサイトにつき 5MB 前後と言われるが、
 * ブラウザによって違い、展示に使うブラウザでは測れていない。目安を超える前でも、保存に失敗したら知らせる（storageLevel）。
 */
export const LOG_STORAGE_ESTIMATE = 5_000_000;
/** 保存の量がこの割合を超えたら注意を出す */
export const LOG_STORAGE_WARN_RATIO = 0.8;

/** 保存の状態：ok = 問題なし、warn = いっぱいに近い、failed = 保存に失敗した（画面を閉じると保存できていない分が消える） */
export type StorageLevel = 'ok' | 'warn' | 'failed';

export function storageLevel(usedChars: number, failed: boolean): StorageLevel {
  if (failed) return 'failed';
  return usedChars / LOG_STORAGE_ESTIMATE >= LOG_STORAGE_WARN_RATIO ? 'warn' : 'ok';
}
