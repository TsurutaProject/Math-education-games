import { RingField } from './RingField';
import { Artwork } from './Artwork';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newGame, shoot, type GameState } from '../logic/game';
import type { LogContext, LogPayload } from '../logic/log';
import { randomId } from '../logic/log';
import { solutionKey } from '../logic/normalize';
import { formatExpression, targetLabel } from '../logic/ops';
import { canReach, distinctSolutions } from '../logic/solver';
import type { Problem, Variant } from '../logic/types';
import { foundEntries, recordSolution, zukanId, type Zukan } from '../logic/zukan';
import { Field, type ShotInfo } from './Field';
import { Hud } from './Hud';
import { PrizeShelf, prizeFor } from './PrizeShelf';
import { logEvent, nextAttemptNo } from './logStore';
import { CelebrateOverlay, OutOverlay, SolutionCards, ZukanScreen } from './Overlays';
import { shooterOf, type Settings } from './settings';
import { mapLabel } from './StageSelect';
import { sfxClear, sfxOut } from './sound';
import { FIELD_H, FIELD_W } from '../logic/hit';

type Phase = 'playing' | 'celebrate' | 'zukan' | 'out';
type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];

interface Props {
  problem: Problem;
  variant: Variant;
  settings: Settings;
  zukan: Zukan;
  /** 遊んでいる人の id（ログ用） */
  playerId: string;
  startReason: StartReason;
  onNext: () => void;
}

/** バリエーションごとの「手応え」の違い（C を厚くする） */
const FEEL: Record<Variant, { celebrateMs: number; outDelayMs: number }> = {
  A: { celebrateMs: 900, outDelayMs: 500 },
  B: { celebrateMs: 900, outDelayMs: 600 },
  C: { celebrateMs: 2000, outDelayMs: 900 },
  D: { celebrateMs: 900, outDelayMs: 600 },
  E: { celebrateMs: 900, outDelayMs: 600 },
};

export function GameScreen({ problem, variant, settings, zukan, playerId, startReason, onNext }: Props) {
  const [game, setGame] = useState<GameState>(() => newGame(problem));
  const [phase, setPhase] = useState<Phase>('playing');
  const [round, setRound] = useState(0);
  const [latest, setLatest] = useState<{ key: string; isNew: boolean }>({ key: '', isNew: false });
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
  const prize = variant === 'C' ? prizeFor(problem.id) : undefined;
  const PlayField = shooter === 'ring' ? RingField : Field;

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
    mapNo: mapLabel(variant, problem.id),
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
      setRound((r) => r + 1);
      logEvent(
        { playerId, variant, shooter, stage: problem.stage, problemId: problem.id, attemptId: attemptId.current },
        startPayload(reason),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [problem, variant, shooter, playerId],
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

  const onShot = (info: ShotInfo) => {
    if (phase !== 'playing') return;
    const next = shoot(problem, game, info.targetId);
    if (next === game) return;
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

    if (next.status === 'cleared') {
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
            active={phase === 'playing'}
            onShot={onShot}
          />
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
            <button className="btn restart" onClick={onRestartButton} aria-label="さいしょから" title="さいしょから">
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
          onAnother={() => startAgain('another_way')}
          onNext={onNext}
        />
      )}
    </div>
  );
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
