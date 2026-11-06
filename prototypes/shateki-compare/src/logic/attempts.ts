import type { LogEvent } from './log';
import { formatExpression } from './ops';
import type { Op } from './types';

/**
 * 挑戦ごとのまとめ（ダウンロードするファイルの attempts）。1回の挑戦 = 1行。
 * 分析班がそのまま表にできるように、イベントの時系列から作る。
 * あとでステージ構成に合わせて重み付けしやすいよう、問題・ステージ・結果を1行にそろえる。
 */
export interface AttemptRow {
  deviceId: string;
  /** 版 1 のログ（起動の id がない）は null */
  sessionId: string | null;
  playerId: string | null;
  attemptId: string;
  variant: string;
  shooter: string;
  stage: number;
  problemId: string;
  /** 目標の数（問題データから。見つからなければ null） */
  goal: number | null;
  /** 挑戦を始めた時刻（ISO）。始まりのイベントがなければ最初のイベントの時刻 */
  startedAt: string;
  /** どうやって始めたか（first / retry / another_way / next / switch / next_player / select） */
  startReason: string | null;
  /** その人がその問題に何回目の挑戦か（再読み込みすると 1 から） */
  attemptNo: number | null;
  /** 始めたとき、図鑑でその問題の解き方をいくつ見つけていたか */
  foundBefore: number | null;
  /** マップの番号（例 "2-5"）。#42 より前のログ・始まりのイベントがない挑戦は null */
  mapNo: string | null;
  /**
   * 結果。clear = クリア、out = 弾切れ、restart = 「さいしょから」、leave = 途中で別の問題・つぎの人に移った、
   * unfinished = 終わりの記録がない（画面を閉じた・ダウンロードした時点で遊んでいる途中など）
   */
  result: 'clear' | 'out' | 'restart' | 'leave' | 'unfinished';
  /** 最後の式（当てた的の順。1つも当てていなければ "0"） */
  expression: string;
  /** 解き方のキー（クリア・弾切れのときだけ） */
  key: string | null;
  /** クリアしたとき、図鑑にとって新しい解き方だったか */
  isNew: boolean | null;
  /** 撃った数・当てた数 */
  shots: number;
  hits: number;
  /** 始めてから1発目の当たり・外れが決まるまでのミリ秒（撃っていなければ null） */
  firstShotMs: number | null;
  /** 始めてから終わりまでのミリ秒（終わりの記録がなければ null） */
  elapsedMs: number | null;
  /** 挑戦の途中で画面が隠れた回数 */
  pageHides: number;
}

const END_RESULT = {
  clear: 'clear',
  out_of_shots: 'out',
  restart: 'restart',
  attempt_leave: 'leave',
} as const;

/** イベントを挑戦ごとにまとめる（挑戦の始まった順） */
export function summarizeAttempts(
  events: ReadonlyArray<LogEvent>,
  meta: { deviceId: string; goalOf?: (problemId: string) => number | null },
): AttemptRow[] {
  const rows = new Map<string, AttemptRow>();
  const steps = new Map<string, Array<{ op: Op; value: number }>>();

  for (const e of events) {
    if (!('attemptId' in e)) continue;
    const id = `${e.sessionId ?? ''}:${e.attemptId}`;
    let row = rows.get(id);
    if (!row) {
      row = {
        deviceId: meta.deviceId,
        sessionId: e.sessionId ?? null,
        playerId: e.playerId ?? null,
        attemptId: e.attemptId,
        variant: e.variant,
        shooter: e.shooter,
        stage: e.stage,
        problemId: e.problemId,
        goal: meta.goalOf?.(e.problemId) ?? null,
        startedAt: e.t,
        startReason: null,
        attemptNo: null,
        foundBefore: null,
        mapNo: null,
        result: 'unfinished',
        expression: '0',
        key: null,
        isNew: null,
        shots: 0,
        hits: 0,
        firstShotMs: null,
        elapsedMs: null,
        pageHides: 0,
      };
      rows.set(id, row);
      steps.set(id, []);
    }
    switch (e.type) {
      case 'problem_start':
        row.startedAt = e.t;
        row.startReason = e.reason;
        row.attemptNo = e.attemptNo ?? null;
        row.foundBefore = e.foundBefore ?? null;
        row.mapNo = e.mapNo ?? null;
        break;
      case 'shot':
        row.shots += 1;
        if (row.firstShotMs === null && e.sinceStartMs !== undefined) row.firstShotMs = e.sinceStartMs;
        break;
      case 'value_change':
        row.hits += 1;
        steps.get(id)!.push({ op: e.op, value: e.value });
        row.expression = formatExpression(steps.get(id)!);
        break;
      case 'page_hide':
        row.pageHides += 1;
        break;
      case 'clear':
      case 'out_of_shots':
      case 'restart':
      case 'attempt_leave':
        row.result = END_RESULT[e.type];
        if (e.elapsedMs !== undefined) row.elapsedMs = e.elapsedMs;
        if (e.type === 'clear' || e.type === 'out_of_shots') row.key = e.key ?? null;
        if (e.type === 'clear') row.isNew = e.isNew;
        break;
    }
  }
  return [...rows.values()];
}
