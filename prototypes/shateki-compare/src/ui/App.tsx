import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { LogPayload, SessionPayload } from '../logic/log';
import { courseStage, FIRST_REF, mapNo, nextRef, nodeAt, type NodeRef } from '../logic/course';
import { selectionInfo } from '../logic/progress';
import { problemById } from '../logic/problems';
import type { Shooter } from '../logic/types';
import type { Zukan } from '../logic/zukan';
import { GameScreen } from './GameScreen';
import { PLATFORM_URL } from './platform';
import { StageSelect } from './StageSelect';
import { currentPlayerId, getLogLevel, logSessionEvent, nextPlayer, subscribeLog } from './logStore';
import { SettingsPanel } from './SettingsPanel';
import { useTutorial } from './useTutorial';
import { afterLeave, IN_PROBLEM_STEPS, TUTORIAL_REF } from '../logic/tutorial';
import {
  exhibitFromUrl,
  isStaffKey,
  loadSettings,
  playSettings,
  saveSettings,
  shooterAllowed,
  shooterOf,
  refFromUrl,
  writeUrlParams,
  type Settings,
} from './settings';
import { setBgmSettings, setSoundEnabled, unlockAudio } from './sound';

type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];
type MapOpenReason = Extract<SessionPayload, { type: 'map_open' }>['reason'];

export function App() {
  const [exhibit] = useState(exhibitFromUrl);
  // いま遊ぶ（または最後に遊んだ）問題の、コースの中の位置
  const [ref, setRef] = useState<NodeRef>(() => refFromUrl() ?? FIRST_REF);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  // ログの保存がいっぱいに近い・失敗したら、画面の隅に小さな印を出す（スタッフが気づけるように）
  const logLevel = useSyncExternalStore(subscribeLog, getLogLevel);
  // 遊んでいる人の id（ログ用）。「つぎの人へ」でだけ変わる
  const [playerId, setPlayerId] = useState(currentPlayerId);
  // はじめの手引き（#15）。遊ぶ人ごとに1回だけ
  const tutorial = useTutorial(playerId, settings.tutorial);
  const inTutorialProblem = IN_PROBLEM_STEPS.includes(tutorial.step);
  // 狙い方の手引きを見たことは ref に覚えるので、消すときに描き直す
  const [, setPullRender] = useState(0);
  // ログに最後に残した設定（設定パネルを閉じたとき、変わっていれば残す）
  const loggedSettings = useRef(JSON.stringify(settings));
  // はじめはマップから。展示モードでもマップを出す（いまどこまで進んでいるかがわかるように。#52）
  const [selectingStage, setSelectingStage] = useState(true);
  // マップを開いたときのログ（#56）。開くたびに mapOpenSeq を増やし、1回だけ残す（StrictMode で2回呼ばれても）
  const [mapOpenSeq, setMapOpenSeq] = useState(0);
  const mapReason = useRef<MapOpenReason>('start');
  const loggedMapOpen = useRef(-1);
  const mapOpenedAt = useRef(performance.now());
  const mapMisses = useRef(0);
  const openMap = (reason: MapOpenReason) => {
    // 1-1 の手引きの途中で出たら、マップからやり直す（クリアしたあとなら終わり）
    if (inTutorialProblem) tutorial.go(afterLeave(tutorial.step));
    mapReason.current = reason;
    setMapOpenSeq((n) => n + 1);
    setSelectingStage(true);
  };
  useEffect(() => {
    if (!selectingStage || loggedMapOpen.current === mapOpenSeq) return;
    loggedMapOpen.current = mapOpenSeq;
    mapOpenedAt.current = performance.now();
    mapMisses.current = 0;
    logSessionEvent({ type: 'map_open', reason: mapReason.current });
  }, [selectingStage, mapOpenSeq]);
  // 図鑑はこのセッションの間だけ（再読み込みで消える）
  const zukan = useRef<Zukan>(new Map());
  // その人が1発以上撃った問題（マップの「挑戦済み」用）。図鑑と同じく、つぎの人へで空にする
  const played = useRef(new Set<string>());
  // 問題を作り直すたびに増やして GameScreen を新しくする
  const [session, setSession] = useState({ n: 0, reason: 'first' as StartReason });

  // 展示モードでは ?shooter= が効かないので、URL に残さない（#46）
  useEffect(() => writeUrlParams(ref, exhibit ? null : settings.shooter), [ref, exhibit, settings.shooter]);
  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
    setBgmSettings(settings.bgm, settings.bgmVolume);
  }, [settings]);

  // 展示モード：スタッフだけが知っているキー（Ctrl + Shift + S）で、確認してから設定パネルを開く
  useEffect(() => {
    if (!exhibit || showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isStaffKey(e) || e.repeat) return;
      e.preventDefault();
      if (window.confirm('スタッフ用の設定を開きます。よろしいですか？')) setShowSettings(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exhibit, showSettings]);

  const node = nodeAt(ref) ?? nodeAt(FIRST_REF)!;
  const variant = node.variant;
  const problem = problemById(node.problemId)!;
  // 遊ぶときの設定。展示モードでは、射撃タイプを問題ごとに決めたものにする（#46）
  const play = useMemo(() => playSettings(node, settings, exhibit), [node, settings, exhibit]);

  const restartWith = (reason: StartReason) => setSession((s) => ({ n: s.n + 1, reason }));

  const changeShooter = (sh: Shooter) => {
    if (sh === settings.shooter) return;
    setSettings({ ...settings, shooter: sh });
    if (shooterAllowed(variant, sh)) restartWith('switch');
  };

  const changeProblem = (to: NodeRef) => {
    setRef(to);
    setSelectingStage(false);
    restartWith('switch');
  };

  /** 設定パネルを閉じる。設定が変わっていれば、変更後の設定をログに残す（スライダーを動かすたびには残さない） */
  const closeSettings = () => {
    const now = JSON.stringify(settings);
    if (now !== loggedSettings.current) {
      loggedSettings.current = now;
      logSessionEvent({ type: 'settings_change', settings });
    }
    setShowSettings(false);
  };

  /** つぎの人へ：新しい人の id にして、図鑑を空にし、マップ（ステージ 1）にもどる */
  const startNextPlayer = () => {
    closeSettings();
    const player = nextPlayer();
    setPlayerId(player);
    tutorial.reset(player);
    zukan.current = new Map();
    played.current = new Set();
    setRef(FIRST_REF);
    restartWith('next_player');
    openMap('next_player');
  };

  /** つぎの問題へ。コースの最後の問題のあとはマップにもどる */
  const next = () => {
    // 手引きの 1-1 から「つぎの問題へ」で進んだら、手引きは終わり
    if (inTutorialProblem) tutorial.go('done');
    const to = nextRef(ref);
    if (!to) {
      openMap('course_end');
      return;
    }
    setRef(to);
    restartWith('next');
  };

  return (
    <div className={`app game-ui festival ${selectingStage ? 'festival-map' : 'festival-playing'}`} onPointerDownCapture={unlockAudio} onKeyDownCapture={unlockAudio}>
      <div className="festival-awning" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <span key={i} />)}</div>
      <header className="topbar">
        {/* タイトルを押すとプラットフォームのホームにもどる（#49）。分ケーキに合わせて確認は出さない。ログは残る */}
        <a className="title" href={PLATFORM_URL} target="_top" title="ホームにもどる">さんすう射的 {!exhibit && <span className="tag">試作</span>}</a>
        {logLevel !== 'ok' && (
          <span
            className="log-alert"
            title={logLevel === 'failed' ? 'ログを保存できていません。今すぐダウンロードしてください' : 'ログの保存がいっぱいに近づいています'}
          >
            ● ログ
          </span>
        )}
        <div className="where">
          {selectingStage ? 'ステージセレクト' : `ステージ ${mapNo(ref)}`}
        </div>
        {!selectingStage && <button className="btn small" onClick={() => openMap('button')}>マップへ</button>}
        {!exhibit && <button className="gear" onClick={() => setShowSettings(true)} aria-label="設定">
          ⚙️
        </button>}
      </header>
      {selectingStage ? <StageSelect current={tutorial.step === 'map' ? TUTORIAL_REF : ref}
        guide={tutorial.step === 'map' ? { ref: TUTORIAL_REF, onSkip: () => tutorial.go('done', true) } : null} zukan={zukan.current} played={played.current} settings={settings} exhibit={exhibit} onMiss={() => { mapMisses.current += 1; }} onSelect={(to) => {
        const picked = nodeAt(to)!;
        logSessionEvent({
          type: 'map_select',
          mapNo: mapNo(to),
          variant: picked.variant,
          unit: courseStage(to.stage)!.unit,
          role: picked.role,
          ...selectionInfo(zukan.current, to),
          mapMs: Math.round(performance.now() - mapOpenedAt.current),
          misses: mapMisses.current,
        });
        if (tutorial.step === 'map') tutorial.go('goal');
        setRef(to); restartWith('select'); setSelectingStage(false);
      }} /> : <GameScreen
        key={`${session.n}-${mapNo(ref)}-${shooterOf(variant, play)}`}
        problem={problem}
        variant={variant}
        mapNo={mapNo(ref)}
        unit={courseStage(ref.stage)!.unit}
        role={node.role}
        settings={play}
        zukan={zukan.current}
        playerId={playerId}
        startReason={session.reason}
        onPlayed={() => played.current.add(problem.id)}
        onNext={next}
        tutorial={inTutorialProblem && ref.stage === TUTORIAL_REF.stage && ref.index === TUTORIAL_REF.index ? tutorial.step : undefined}
        onTutorial={tutorial.go}
        pullGuide={!tutorial.pullSeen(shooterOf(variant, play))}
        onPullGuideDone={(skipped) => {
          const shooter = shooterOf(variant, play);
          if (tutorial.pullSeen(shooter)) return;
          logSessionEvent({ type: 'pull_guide', shooter, skipped });
          tutorial.markPull(shooter);
          setPullRender((n) => n + 1);
        }}
      />}
      {showSettings && (
        <SettingsPanel
          current={ref}
          settings={settings}
          onShooter={changeShooter}
          onProblem={changeProblem}
          onSettings={setSettings}
          onClose={closeSettings}
          onNextPlayer={startNextPlayer}
          exhibit={exhibit}
        />
      )}
    </div>
  );
}
