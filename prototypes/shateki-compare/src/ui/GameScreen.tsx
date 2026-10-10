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
import { logEvent } from './logStore';
import { CelebrateOverlay, OutOverlay, ZukanScreen } from './Overlays';
import { shooterOf, type Settings } from './settings';
import { sfxClear, sfxOut } from './sound';
import { FIELD_H, FIELD_W } from '../logic/hit';

type Phase = 'playing' | 'celebrate' | 'zukan' | 'out';
type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];

interface Props {
  problem: Problem;
  variant: Variant;
  settings: Settings;
  zukan: Zukan;
  startReason: StartReason;
  onNext: () => void;
}

/** バリエーションごとの「手応え」の違い（C を厚くする） */
const FEEL: Record<Variant, { countMs: number; countDelayMs: number; celebrateMs: number; outDelayMs: number }> = {
  A: { countMs: 0, countDelayMs: 0, celebrateMs: 900, outDelayMs: 500 },
  B: { countMs: 0, countDelayMs: 0, celebrateMs: 900, outDelayMs: 600 },
  C: { countMs: 380, countDelayMs: 260, celebrateMs: 2000, outDelayMs: 900 },
  D: { countMs: 0, countDelayMs: 0, celebrateMs: 900, outDelayMs: 600 },
};

export function GameScreen({ problem, variant, settings, zukan, startReason, onNext }: Props) {
  const [game, setGame] = useState<GameState>(() => newGame(problem));
  const [phase, setPhase] = useState<Phase>('playing');
  const [round, setRound] = useState(0);
  const [latest, setLatest] = useState<{ key: string; isNew: boolean }>({ key: '', isNew: false });
  const attemptId = useRef(randomId());
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
  const feel = FEEL[variant];
  const prize = variant === 'C' ? prizeFor(problem.id) : undefined;

  const ctx = (): LogContext => ({
    variant,
    shooter,
    stage: problem.stage,
    problemId: problem.id,
    attemptId: attemptId.current,
  });
  const log = (payload: LogPayload) => logEvent(ctx(), payload);

  // 問題の開始（最初の1回）
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    log({ type: 'problem_start', reason: startReason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => clearTimers, []);

  const startAgain = useCallback(
    (reason: StartReason) => {
      clearTimers();
      attemptId.current = randomId();
      setGame(newGame(problem));
      setPhase('playing');
      setRound((r) => r + 1);
      logEvent(
        { variant, shooter, stage: problem.stage, problemId: problem.id, attemptId: attemptId.current },
        { type: 'problem_start', reason },
      );
    },
    [problem, variant, shooter],
  );

  const onRestartButton = () => {
    log({ type: 'restart', current: game.current, shotsLeft: game.shotsLeft });
    startAgain('retry');
  };

  const onShot = (info: ShotInfo) => {
    if (phase !== 'playing') return;
    const next = shoot(problem, game, info.targetId);
    if (next === game) return;
    const reachable = canReach(problem, next.current, next.usedIds, next.shotsLeft);
    const target = info.targetId ? problem.targets.find((t) => t.id === info.targetId) : undefined;
    log({
      type: 'shot',
      aim: { x: round3(info.aim.x / FIELD_W), y: round3(info.aim.y / FIELD_H) },
      hitTargetId: info.targetId,
      hitLabel: target ? targetLabel(target.op, target.value) : null,
      assist: round3(info.assist),
      shotsLeftBefore: game.shotsLeft,
      pointerType: info.pointerType,
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
      });
      setLatest({ key, isNew });
      setPhase('celebrate');
      later(() => sfxClear(variant === 'C'), variant === 'C' ? 450 : 150);
      later(() => setPhase('zukan'), feel.celebrateMs);
    } else if (next.status === 'out') {
      log({ type: 'out_of_shots', current: next.current, goal: problem.goal, diff: problem.goal - next.current });
      later(() => {
        sfxOut();
        setPhase('out');
      }, feel.outDelayMs);
    }
  };

  return (
    <div className="game">
      <Hud
        key={`hud-${round}`}
        goal={problem.goal}
        current={game.current}
        shots={problem.shots}
        shotsLeft={game.shotsLeft}
        steps={game.steps}
        showExpression={settings.showExpression}
        countMs={feel.countMs}
        countDelayMs={feel.countDelayMs}
        onRestart={onRestartButton}
        prize={
          prize && (
            <PrizeShelf
              prize={prize}
              goal={problem.goal}
              current={game.current}
              hits={game.steps.length}
              fallen={game.status === 'cleared'}
            />
          )
        }
      />
      <Field
        key={`field-${round}`}
        problem={problem}
        variant={variant}
        settings={settings}
        usedIds={game.usedIds}
        current={game.current}
        shotsLeft={game.shotsLeft}
        active={phase === 'playing'}
        onShot={onShot}
      />
      {phase === 'celebrate' && <CelebrateOverlay prize={prize} />}
      {phase === 'out' && (
        <OutOverlay
          goal={problem.goal}
          current={game.current}
          steps={game.steps}
          onRetry={() => startAgain('retry')}
          onNext={onNext}
        />
      )}
      {phase === 'zukan' && (
        <ZukanScreen
          goal={problem.goal}
          entries={foundEntries(zukan, zid)}
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
