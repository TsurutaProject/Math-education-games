import { useEffect, useRef, useState } from 'react';
import type { LogPayload } from '../logic/log';
import { problemsFor, setForVariant, stagesFor } from '../logic/problems';
import type { Shooter, Variant } from '../logic/types';
import type { Zukan } from '../logic/zukan';
import { GameScreen } from './GameScreen';
import { StageSelect, stageNodes } from './StageSelect';
import { SettingsPanel } from './SettingsPanel';
import {
  exhibitFromUrl,
  isStaffKey,
  loadSettings,
  saveSettings,
  shooterAllowed,
  shooterOf,
  VARIANTS,
  variantFromUrl,
  writeUrlParams,
  type Settings,
} from './settings';
import { setBgmSettings, setSoundEnabled, unlockAudio } from './sound';

type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];

export function App() {
  const [exhibit] = useState(exhibitFromUrl);
  const [variant, setVariant] = useState<Variant>(() => variantFromUrl() ?? 'A');
  const [stage, setStage] = useState(1);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [selectingStage, setSelectingStage] = useState(() => !exhibit);
  // 図鑑はこのセッションの間だけ（再読み込みで消える）
  const zukan = useRef<Zukan>(new Map());
  // 問題を作り直すたびに増やして GameScreen を新しくする
  const [session, setSession] = useState({ n: 0, reason: 'first' as StartReason });

  useEffect(() => writeUrlParams(variant, settings.shooter), [variant, settings.shooter]);
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

  const set = setForVariant(variant);
  const problems = problemsFor(set, stage);
  const problem = problems[Math.min(index, problems.length - 1)];

  const restartWith = (reason: StartReason) => setSession((s) => ({ n: s.n + 1, reason }));

  const changeVariant = (v: Variant) => {
    if (v === variant) return;
    setVariant(v);
    restartWith('switch');
  };

  const changeShooter = (sh: Shooter) => {
    if (sh === settings.shooter) return;
    setSettings({ ...settings, shooter: sh });
    if (shooterAllowed(variant, sh)) restartWith('switch');
  };

  const changeProblem = (s: number, i: number) => {
    setStage(s);
    setIndex(i);
    restartWith('switch');
  };

  const next = () => {
    const stages = stagesFor(set);
    if (index + 1 < problems.length) {
      setIndex(index + 1);
    } else {
      const si = stages.indexOf(stage);
      setStage(stages[(si + 1) % stages.length]);
      setIndex(0);
    }
    restartWith('next');
  };

  return (
    <div className={`app game-ui ${selectingStage ? 'festival-map' : 'festival-playing'}`} onPointerDownCapture={unlockAudio} onKeyDownCapture={unlockAudio}>
      <header className="topbar">
        <div className="title">さんすう射的 {!exhibit && <span className="tag">試作</span>}</div>
        <div className="where">
          {selectingStage ? 'ステージセレクト' : `ステージ ${VARIANTS.indexOf(variant) + 1}-${stageNodes(variant).findIndex((n) => n.stage === stage && n.index === Math.min(index, problems.length - 1)) + 1}`}
        </div>
        {!exhibit && !selectingStage && <button className="btn small" onClick={() => setSelectingStage(true)}>マップへ</button>}
        {!exhibit && <button className="gear" onClick={() => setShowSettings(true)} aria-label="設定">
          ⚙️
        </button>}
      </header>
      {selectingStage ? <StageSelect variant={variant} stage={stage} index={index} zukan={zukan.current} onSelect={(v, s, i) => {
        setVariant(v); setStage(s); setIndex(i); restartWith('switch'); setSelectingStage(false);
      }} /> : <GameScreen
        key={`${session.n}-${variant}-${shooterOf(variant, settings)}-${problem.id}`}
        problem={problem}
        variant={variant}
        settings={settings}
        zukan={zukan.current}
        startReason={session.reason}
        onNext={next}
      />}
      {showSettings && (
        <SettingsPanel
          variant={variant}
          stage={stage}
          index={index}
          settings={settings}
          onVariant={changeVariant}
          onShooter={changeShooter}
          onProblem={changeProblem}
          onSettings={setSettings}
          exhibit={exhibit}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
