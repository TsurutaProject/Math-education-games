import { RingField } from './RingField';
import { Artwork } from './Artwork';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newGame, shoot, type GameState } from '../logic/game';
import type { LogContext, LogPayload } from '../logic/log';
import { randomId } from '../logic/log';
import { solutionKey } from '../logic/normalize';
import { formatExpression, targetLabel } from '../logic/ops';
import { canReach, distinctSolutions } from '../logic/solver';
import { chooseHint } from '../logic/hint';
import type { NodeRole, Unit } from '../logic/course';
import type { Problem, Variant } from '../logic/types';
import { foundEntries, recordSolution, zukanId, type Zukan } from '../logic/zukan';
import { Field, type ShotInfo } from './Field';
import type { HintMark } from './HintGlow';
import { Hud } from './Hud';
import { PrizeShelf, prizeFor } from './PrizeShelf';
import { logEvent, nextAttemptNo } from './logStore';
import { CelebrateOverlay, OutOverlay, SolutionCards, ZukanScreen } from './Overlays';
import { shooterOf, type Settings } from './settings';
import { sfxClear, sfxOut } from './sound';
import { Spotlight, TutorialBubble } from './TutorialBubble';
import { afterRestart, afterShot, coachTargets, TUTORIAL_TARGET, type TutorialStep } from '../logic/tutorial';
import { FIELD_H, FIELD_W } from '../logic/hit';

type Phase = 'playing' | 'celebrate' | 'zukan' | 'out';
type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];

interface Props {
  problem: Problem;
  variant: Variant;
  /** マップの番号（例 "2-3"） */
  mapNo: string;
  /** 単元と、はじめの問題かメインの問題か（ログ用） */
  unit: Unit;
  role: NodeRole;
  settings: Settings;
  zukan: Zukan;
  /** 遊んでいる人の id（ログ用） */
  playerId: string;
  startReason: StartReason;
  /** 1発撃ったとき（マップの「挑戦済み」用） */
  onPlayed: () => void;
  onNext: () => void;
  /** はじめの手引き（#15）の手順。1-1 で手引きをしているときだけ渡す */
  tutorial?: TutorialStep;
  onTutorial?: (step: TutorialStep, skipped?: boolean) => void;
  /**
   * パチンコ・輪投げの狙い方の手引きを出すか（その人がまだ見ていない射撃タイプのとき）。
   * 手引きをする問題（COACH_PLANS）でだけ出る。onPullGuideDone で、見たことを覚える
   */
  pullGuide?: boolean;
  onPullGuideDone?: (skipped: boolean) => void;
}

/** バリエーションごとの「手応え」の違い（C を厚くする） */
const FEEL: Record<Variant, { celebrateMs: number; outDelayMs: number }> = {
  A: { celebrateMs: 900, outDelayMs: 500 },
  B: { celebrateMs: 900, outDelayMs: 600 },
  C: { celebrateMs: 2000, outDelayMs: 900 },
  D: { celebrateMs: 900, outDelayMs: 600 },
  E: { celebrateMs: 900, outDelayMs: 600 },
};

export function GameScreen({ problem, variant, mapNo, unit, role, settings, zukan, playerId, startReason, onPlayed, onNext, tutorial = 'done', onTutorial = () => {}, pullGuide = false, onPullGuideDone = () => {} }: Props) {
  const [game, setGame] = useState<GameState>(() => newGame(problem));
  const [phase, setPhase] = useState<Phase>('playing');
  const [round, setRound] = useState(0);
  const [latest, setLatest] = useState<{ key: string; isNew: boolean }>({ key: '', isNew: false });
  // ヒント（#57）：光らせる的。押すたびに seq を増やす。restartPulse は「さいしょから」を強調したときの seq（0 はなし）
  const [hint, setHint] = useState<HintMark | null>(null);
  const [restartPulse, setRestartPulse] = useState(0);
  const hintSeq = useRef(0);
  // 前に選んだ解き方。まだ行けるあいだは同じ解き方を続ける（押すたびに道が変わって迷わないように）
  const hintKey = useRef<string | undefined>(undefined);
  const attemptId = useRef(randomId());
  /** 挑戦を始めた時刻（performance.now）。経過時間をログに残すため */
  const attemptStartedAt = useRef(performance.now());
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const total = useMemo(() => distinctSolutions(problem).size, [problem]);
  // 射撃タイプがちがえば別の図鑑にする（遊び比べで混ざらないように）
  const shooter = shooterOf(variant, settings);
  const zid = zukanId(shooter === 'gun' || shooter === 'tap' ? variant : `${variant}-${shooter}`, problem.id);
  const entries = foundEntries(zukan, zid);
  const feel = FEEL[variant];
  // 全部の解き方を見つけたら、ヒントは押せない
  const allFound = entries.length >= total;
  const prize = variant === 'C' ? prizeFor(problem.id) : undefined;
  const PlayField = shooter === 'ring' ? RingField : Field;
  // 手引きで、説明を読んでもらう手順（このあいだは撃てない）。ヒントは自分で選ぶ手順から
  const tutorialReading = tutorial === 'goal' || tutorial === 'current' || tutorial === 'changed';
  const tutorialGuiding = tutorialReading || tutorial === 'aim';
  // 狙い方の手引き：決めた的を順に撃たせる。coachDone はこの挑戦で手引きどおりに当てた数
  const coachList = pullGuide ? coachTargets(shooter, problem.id) : null;
  const [coachDone, setCoachDone] = useState(0);
  const coachTarget = coachList && coachDone < coachList.length && phase === 'playing' ? coachList[coachDone] : null;

  const ctx = (): LogContext => ({
    playerId,
    variant,
    shooter,
    stage: problem.stage,
    problemId: problem.id,
    attemptId: attemptId.current,
  });
  const log = (payload: LogPayload) => logEvent(ctx(), payload);

  const elapsedMs = () => Math.round(performance.now() - attemptStartedAt.current);
  /** 挑戦の始まりのログ：何回目の挑戦か、始めたときに図鑑でいくつ見つけていたか */
  const startPayload = (reason: StartReason): LogPayload => ({
    type: 'problem_start',
    reason,
    attemptNo: nextAttemptNo(playerId, zid),
    foundBefore: foundEntries(zukan, zid).length,
    mapNo,
    unit,
    role,
  });

  // 問題の開始（最初の1回）
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    log(startPayload(startReason));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => clearTimers, []);

  // 画面が隠れた・戻ったことを残す（途中でやめたかを見るため）
  const latestGame = useRef(game);
  latestGame.current = game;

  // 終わる前（クリア・弾切れの前）に、1発以上撃ってから別の問題・つぎの人などに移ったら「途中でやめた」を残す。
  // 1発も撃っていないときは残さない（StrictMode の試しの片付けで、始めた直後に残ってしまわないように）
  useEffect(
    () => () => {
      const g = latestGame.current;
      if (g.status !== 'playing' || g.shotsLeft === problem.shots) return;
      log({
        type: 'attempt_leave',
        current: g.current,
        shotsLeft: g.shotsLeft,
        expression: formatExpression(g.steps),
        elapsedMs: elapsedMs(),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        log({ type: 'page_hide', current: latestGame.current.current, shotsLeft: latestGame.current.shotsLeft });
      } else {
        log({ type: 'page_show' });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAgain = useCallback(
    (reason: StartReason) => {
      clearTimers();
      attemptId.current = randomId();
      attemptStartedAt.current = performance.now();
      setGame(newGame(problem));
      setPhase('playing');
      setHint(null);
      setRestartPulse(0);
      setRound((r) => r + 1);
      setCoachDone(0);
      // 手引き：当てたあとの説明なら、もう一度撃たせる。クリア後に「べつの解き方」を選んだら、手引きは終わり
      if (reason === 'another_way' && tutorial === 'next') onTutorial('done');
      else onTutorial(afterRestart(tutorial));
      logEvent(
        { playerId, variant, shooter, stage: problem.stage, problemId: problem.id, attemptId: attemptId.current },
        startPayload(reason),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [problem, variant, shooter, playerId, tutorial],
  );

  const onRestartButton = () => {
    log({
      type: 'restart',
      current: game.current,
      shotsLeft: game.shotsLeft,
      expression: formatExpression(game.steps),
      elapsedMs: elapsedMs(),
    });
    startAgain('retry');
  };

  /**
   * ヒント（#57）：図鑑にまだない解き方を1つ選び、つぎに当てる的を3秒光らせる。
   * いまの式の続きで行ける解き方がなければ、「さいしょから」を強調する。D・E はマイナスにする札を出さないので、
   * マイナスを通らない道だけから選ぶ
   */
  const onHint = () => {
    if (phase !== 'playing' || allFound || tutorialGuiding || coachTarget) return;
    const h = chooseHint(problem, game, new Set(entries.map((e) => e.key)), {
      previousKey: hintKey.current,
      nonNegativeOnly: variant === 'D' || variant === 'E',
    });
    if (h.kind === 'none') return;
    const target = h.kind === 'target' ? problem.targets.find((t) => t.id === h.targetId) : undefined;
    log({
      type: 'hint',
      sinceStartMs: elapsedMs(),
      current: game.current,
      shotsLeft: game.shotsLeft,
      key: h.kind === 'target' ? h.key : null,
      targetId: target?.id ?? null,
      targetLabel: target ? targetLabel(target.op, target.value) : null,
      restart: h.kind === 'restart',
    });
    hintSeq.current += 1;
    if (h.kind === 'target') {
      hintKey.current = h.key;
      setHint({ seq: hintSeq.current, targetId: h.targetId });
    } else {
      setHint(null);
      setRestartPulse(hintSeq.current);
    }
  };

  const onShot = (info: ShotInfo) => {
    if (phase !== 'playing') return;
    const next = shoot(problem, game, info.targetId);
    if (next === game) return;
    onPlayed();
    // 撃ったら、前のヒントの光は消す（撃ったあとの式では、もう合わないことがあるため）
    setHint(null);
    const reachable = canReach(problem, next.calc, next.usedIds, next.shotsLeft);
    const target = info.targetId ? problem.targets.find((t) => t.id === info.targetId) : undefined;
    log({
      type: 'shot',
      aim: { x: round3(info.aim.x / FIELD_W), y: round3(info.aim.y / FIELD_H) },
      hitTargetId: info.targetId,
      hitLabel: target ? targetLabel(target.op, target.value) : null,
      assist: round3(info.assist),
      shotsLeftBefore: game.shotsLeft,
      pointerType: info.pointerType,
      sinceStartMs: elapsedMs(),
      aimMs: info.aimMs,
      pressMs: Math.max(0, Math.round(info.pressedAt - attemptStartedAt.current)),
      reachableAfter: reachable,
      ...(info.launch
        ? {
            launch: info.launch.landing
              ? { ...info.launch, landing: { x: round3(info.launch.landing.x / FIELD_W), y: round3(info.launch.landing.y / FIELD_H) } }
              : info.launch,
          }
        : {}),
    });
    if (target) {
      log({
        type: 'value_change',
        op: target.op,
        value: target.value,
        before: game.current,
        after: next.current,
        shotsLeft: next.shotsLeft,
        reachable,
      });
    }
    setGame(next);
    if (coachList && coachTarget && info.targetId === coachTarget) {
      if (coachDone + 1 >= coachList.length) onPullGuideDone(false);
      setCoachDone((n) => n + 1);
    }
    if (tutorial === 'aim') onTutorial(afterShot(tutorial, info.targetId));

    if (next.status === 'cleared') {
      if (tutorial === 'free') onTutorial('next');
      const key = solutionKey(next.steps);
      const expression = formatExpression(next.steps);
      const isNew = recordSolution(zukan, zid, { key, expression });
      log({
        type: 'clear',
        key,
        expression,
        isNew,
        shotsLeft: next.shotsLeft,
        foundCount: foundEntries(zukan, zid).length,
        totalCount: total,
        elapsedMs: elapsedMs(),
      });
      setLatest({ key, isNew });
      setPhase('celebrate');
      later(() => sfxClear(variant === 'C'), variant === 'C' ? 450 : 150);
      later(() => setPhase('zukan'), feel.celebrateMs);
    } else if (next.status === 'out') {
      log({
        type: 'out_of_shots',
        current: next.current,
        goal: problem.goal,
        diff: problem.goal - next.current,
        expression: formatExpression(next.steps),
        key: solutionKey(next.steps),
        elapsedMs: elapsedMs(),
      });
      later(() => {
        sfxOut();
        setPhase('out');
      }, feel.outDelayMs);
    }
  };

  return (
    <div className="game">
      <div className="play-layout">
        <div className="play-top">
          <Hud goal={problem.goal} steps={game.steps} shotsLeft={game.shotsLeft} showExpression={settings.showExpression} />
        </div>
        <div className={`play-area ${shooter === 'sling' ? 'play-area-sling' : ''}`}>
          <PlayField
            key={`field-${round}`}
            problem={problem}
            variant={variant}
            settings={settings}
            usedIds={game.usedIds}
            calc={game.calc}
            shotsLeft={game.shotsLeft}
            active={phase === 'playing' && !tutorialReading}
            hint={hint}
            tutorialTarget={tutorial === 'aim' ? TUTORIAL_TARGET : null}
            coachTarget={coachTarget}
            onShot={onShot}
          />
          {coachTarget && coachList && <TutorialBubble className="tutorial-corner tutorial-compact" onSkip={() => onPullGuideDone(true)}>
            {coachDone === 0 ? 'ひかっている まとを ねらおう' : 'こんどは とおくの まとを ねらおう'}
          </TutorialBubble>}
          {/* 1-1 の手引き：画面を暗くして、見てほしいところだけ照らす */}
          {tutorial === 'goal' && <Spotlight selector=".equation-goal" onOk={() => onTutorial('current')} onSkip={() => onTutorial('done', true)}>
            <b>めあて</b>　この かずに しよう
          </Spotlight>}
          {tutorial === 'current' && <Spotlight selector=".equation-zero" onOk={() => onTutorial('aim')} onSkip={() => onTutorial('done', true)}>
            <b>いまの かず</b>　0 から スタート
          </Spotlight>}
          {tutorial === 'aim' && <Spotlight selector={`[data-target-id="${TUTORIAL_TARGET}"]`} pad={14} round tap onSkip={() => onTutorial('done', true)}>
            ここを タップ！
          </Spotlight>}
          {tutorial === 'changed' && <Spotlight selector=".festival-equation-area" pad={6} onOk={() => onTutorial('free')} onSkip={() => onTutorial('done', true)}>
            <b>{game.current}</b> に なった！　あと <b>{problem.goal - game.current}</b>
          </Spotlight>}
          {tutorial === 'free' && phase === 'playing' && <TutorialBubble className="tutorial-bottom" onSkip={() => onTutorial('done', true)}>
            あとは じぶんで えらんで <b>{problem.goal}</b> に しよう
          </TutorialBubble>}
        </div>
        <div className="play-bottom">
          <section className="play-zukan" aria-labelledby="play-zukan-title">
            <div className="play-zukan-head">
              <h2 id="play-zukan-title">解き方ずかん</h2>
              <p className="play-zukan-count" aria-live="polite">{total}つ中 <b>{entries.length}つ</b> 見つけた！</p>
            </div>
            <SolutionCards entries={entries} total={total} goal={problem.goal} compact />
          </section>
          <div className="festival-footer-actions">
            {prize && <PrizeShelf prize={prize} goal={problem.goal} current={game.current} hits={game.steps.length} fallen={game.status === 'cleared'} />}
            {shooter === 'tap' && <div className="festival-tap-ammo" aria-label={`のこり ${game.shotsLeft} 発、全部で ${problem.shots} 発`}>
              <span>のこりの たま</span><strong>{game.shotsLeft} / {problem.shots}</strong>
              <div className="corks">{Array.from({ length: problem.shots }, (_, i) => <span key={i} className={`ammo-art ${i < game.shotsLeft ? '' : 'used'}`}><Artwork name="ammo" x={0} y={0} width={16} height={16} /></span>)}</div>
            </div>}
            <button
              className="btn hint-btn"
              onClick={onHint}
              disabled={allFound || phase !== 'playing' || tutorialGuiding}
              aria-label={allFound ? 'ヒント（ぜんぶ 見つけた）' : 'ヒント'}
              title={allFound ? 'ぜんぶ 見つけた！' : 'ヒント'}
            >
              <span aria-hidden="true">💡</span>
              <span>ヒント</span>
            </button>
            <button key={`restart-${restartPulse}`} className={`btn restart ${restartPulse ? 'hint-emphasis' : ''}`} onClick={onRestartButton} aria-label="さいしょから" title="さいしょから">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 3v6h-6" /><path d="M20 9a8 8 0 1 0 .1 5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {phase === 'celebrate' && <CelebrateOverlay prize={prize} />}
      {phase === 'out' && (
        <OutOverlay
          goal={problem.goal}
          steps={game.steps}
          onRetry={() => startAgain('retry')}
          onNext={onNext}
        />
      )}
      {phase === 'zukan' && (
        <ZukanScreen
          goal={problem.goal}
          entries={entries}
          total={total}
          latestKey={latest.key}
          latestIsNew={latest.isNew}
          prize={prize}
          guideNext={tutorial === 'next'}
          onAnother={() => startAgain('another_way')}
          onNext={onNext}
        />
      )}
      {phase === 'zukan' && tutorial === 'next' && <Spotlight selector=".tutorial-pulse" onSkip={() => onTutorial('done', true)}>
        できたね！　つぎの もんだいへ
      </Spotlight>}
    </div>
  );
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
