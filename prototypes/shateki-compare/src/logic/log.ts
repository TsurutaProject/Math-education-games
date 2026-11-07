import type { NodeRole, Unit } from './course';
import type { TutorialStep } from './tutorial';
import type { Op, Shooter, Variant } from './types';

/**
 * ログの形の版。ダウンロードするファイルに入れる。
 * 2：起動ごとの sessionId・人ごとの playerId・通し番号 seq を足した（issue #20）。これらがないイベントは版 1。
 * 3：ステージを単元ごとに作り直した（#52・#56）。stage は単元のステージ（1 足し算・2 引き算・3 掛け算割り算）、
 *    mapNo は「ステージ-何問目」、variant は問題ごとの遊び方になった。unit・role・pressMs・マップのイベントを足した。
 */
export const LOG_SCHEMA_VERSION = 3;

/** 遊びのイベント（1回の挑戦の中で起きること）に付く項目。個人情報は入れない。 */
export interface LogContext {
  /** 遊んでいる人ごとのランダムな id。スタッフ用パネルの「つぎの人へ」でだけ変わる（再読み込みでは変わらない） */
  playerId: string;
  /** その問題の遊び方（版 3 から、1つのステージの中で問題ごとに変わる） */
  variant: Variant;
  /** A は tap。B・C は射撃タイプ */
  shooter: 'tap' | Shooter;
  /** 単元のステージ（版 3 から。1 足し算・2 引き算・3 掛け算割り算） */
  stage: number;
  problemId: string;
  /** 1回の挑戦（問題の開始〜クリア/弾切れ/やり直し）を区別するランダムな id */
  attemptId: string;
}

export type LogPayload =
  | {
      type: 'problem_start';
      reason: 'first' | 'retry' | 'another_way' | 'next' | 'switch' | 'next_player' | 'select';
      /** その人がその問題（射撃タイプ別）に何回目の挑戦か。再読み込みすると 1 から数え直す */
      attemptNo: number;
      /** 始めたとき、図鑑でその問題の解き方をいくつ見つけていたか */
      foundBefore: number;
      /** マップの番号（例 "2-5" ＝ステージ 2 の 5 問目）。版 2 では「バリエーションの順番-何問目」。#42 より前のログにはない */
      mapNo: string;
      /** 単元（add 足し算・sub 引き算・muldiv 掛け算割り算）。版 3 から */
      unit: Unit;
      /** intro = はじめの、単元を伝える問題（A・B）。main = メインの問題（C・D・E）。版 3 から */
      role: NodeRole;
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
      /** 挑戦を始めてから、この1発を押し始めるまでのミリ秒（タップは押した時点）。版 3 から */
      pressMs: number;
      /** 撃ったあと、残りの弾で届くか */
      reachableAfter: boolean;
      /**
       * パチンコ・輪投げのときだけ：飛ばした角度（真上が0、右が+）、引っ張った長さ、飛んでいた時間。
       * パチンコは壁ではね返った回数、輪投げは落ちた場所（フィールド 0〜1）も入る。
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
  /**
   * ヒントを押した（#57）。sinceStartMs は挑戦を始めてからのミリ秒、current・shotsLeft は押したときの数と残りの弾。
   * key は選んだ解き方（クリアと同じ形のキー）、targetId・targetLabel はつぎに光らせる的。
   * いまの式の続きで、まだ見つけていない解き方に行けないときは restart = true で、「さいしょから」を強調した（key・targetId は null）
   */
  | { type: 'hint'; sinceStartMs: number; current: number; shotsLeft: number; key: string | null; targetId: string | null; targetLabel: string | null; restart: boolean }
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
  | { type: 'settings_change'; settings: object }
  /**
   * マップを開いた（版 3 から）。start = 起動したとき、button = 「マップへ」、course_end = コースの最後の問題のあと、
   * next_player = つぎの人へ
   */
  | { type: 'map_open'; reason: 'start' | 'button' | 'course_end' | 'next_player' }
  /**
   * マップで問題を選んだ（版 3 から）。説明の問題を飛ばしたか・どんな順で選んだかを見るため。
   * clearedMapNos：その人がそれまでにクリアした問題（解き方を1つ以上見つけた）。
   * firstUnclearedMapNo：コースの順で、まだクリアしていない最初の問題（全部クリアしていれば null）。
   * skippedMapNos：選んだ問題より前にある、まだクリアしていない問題（空なら飛ばしていない）。
   * mapMs：マップを開いてから選ぶまで。misses：選ぶまでに的のないところを撃った回数
   */
  | {
      type: 'map_select';
      mapNo: string;
      variant: Variant;
      unit: Unit;
      role: NodeRole;
      clearedMapNos: string[];
      firstUnclearedMapNo: string | null;
      skippedMapNos: string[];
      mapMs: number;
      misses: number;
    }
  /**
   * はじめの手引き（#15）の手順が変わった。step = 新しい手順、from = 前の手順、fromMs = 前の手順にいた時間。
   * skipped = 「とばす」を押して終えた。step が map なのは、クリアする前に 1-1 から出て、マップからやり直したとき。
   * 手引きが始まったことは残さない（その人の最初の map_open が始まり）
   */
  | { type: 'tutorial'; step: TutorialStep; from: TutorialStep; fromMs: number; skipped: boolean }
  /** パチンコ・輪投げの指の手引き（#15）を終えた。skipped = 「とばす」を押した（false なら1発撃った） */
  | { type: 'pull_guide'; shooter: string; skipped: boolean };

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

/**
 * ダウンロード用の JSON 文字列。deviceId で、どのパソコンのログかわかるようにする。
 * attempts は挑戦ごとのまとめ（summarizeAttempts）。events は時系列のすべてのイベント。
 */
export function exportLog(
  events: ReadonlyArray<LogEvent>,
  meta: { deviceId: string; attempts?: ReadonlyArray<object> },
  now: Date = new Date(),
): string {
  return JSON.stringify(
    {
      schemaVersion: LOG_SCHEMA_VERSION,
      exportedAt: now.toISOString(),
      deviceId: meta.deviceId,
      count: events.length,
      attempts: meta.attempts ?? [],
      events,
    },
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
