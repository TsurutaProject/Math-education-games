import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { LogPayload } from '../logic/log';
import { FIRST_REF, mapNo, nextRef, nodeAt, type NodeRef } from '../logic/course';
import { problemById } from '../logic/problems';
import type { Shooter } from '../logic/types';
import type { Zukan } from '../logic/zukan';
import { GameScreen } from './GameScreen';
import { StageSelect } from './StageSelect';
import { currentPlayerId, getLogLevel, logSessionEvent, nextPlayer, subscribeLog } from './logStore';
import { SettingsPanel } from './SettingsPanel';
import {
  exhibitFromUrl,
  isStaffKey,
  loadSettings,
  saveSettings,
  shooterAllowed,
  shooterOf,
  refFromUrl,
  writeUrlParams,
  type Settings,
} from './settings';
import { setBgmSettings, setSoundEnabled, unlockAudio } from './sound';

type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];

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
  // ログに最後に残した設定（設定パネルを閉じたとき、変わっていれば残す）
  const loggedSettings = useRef(JSON.stringify(settings));
  // はじめはマップから。展示モードでもマップを出す（いまどこまで進んでいるかがわかるように。#52）
  const [selectingStage, setSelectingStage] = useState(true);
  // 図鑑はこのセッションの間だけ（再読み込みで消える）
  const zukan = useRef<Zukan>(new Map());
  // その人が1発以上撃った問題（マップの「挑戦済み」用）。図鑑と同じく、つぎの人へで空にする
  const played = useRef(new Set<string>());
  // 問題を作り直すたびに増やして GameScreen を新しくする
  const [session, setSession] = useState({ n: 0, reason: 'first' as StartReason });

  useEffect(() => writeUrlParams(ref, settings.shooter), [ref, settings.shooter]);
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
    setPlayerId(nextPlayer());
    zukan.current = new Map();
    played.current = new Set();
    setRef(FIRST_REF);
    restartWith('next_player');
    setSelectingStage(true);
  };

  /** つぎの問題へ。コースの最後の問題のあとはマップにもどる */
  const next = () => {
    const to = nextRef(ref);
    if (!to) {
      setSelectingStage(true);
      return;
    }
    setRef(to);
    restartWith('next');
  };

  return (
    <div className={`app game-ui festival ${selectingStage ? 'festival-map' : 'festival-playing'}`} onPointerDownCapture={unlockAudio} onKeyDownCapture={unlockAudio}>
      <div className="festival-awning" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <span key={i} />)}</div>
      <header className="topbar">
        <div className="title">さんすう射的 {!exhibit && <span className="tag">試作</span>}</div>
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
        {!selectingStage && <button className="btn small" onClick={() => setSelectingStage(true)}>マップへ</button>}
        {!exhibit && <button className="gear" onClick={() => setShowSettings(true)} aria-label="設定">
          ⚙️
        </button>}
      </header>
      {selectingStage ? <StageSelect current={ref} zukan={zukan.current} played={played.current} onSelect={(to) => {
        setRef(to); restartWith('select'); setSelectingStage(false);
      }} /> : <GameScreen
        key={`${session.n}-${mapNo(ref)}-${shooterOf(variant, settings)}`}
        problem={problem}
        variant={variant}
        mapNo={mapNo(ref)}
        settings={settings}
        zukan={zukan.current}
        playerId={playerId}
        startReason={session.reason}
        onPlayed={() => played.current.add(problem.id)}
        onNext={next}
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
