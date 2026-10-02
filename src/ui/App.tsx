import { useEffect, useRef, useState } from 'react';
import type { LogPayload } from '../logic/log';
import { problemsFor, setForVariant, stagesFor } from '../logic/problems';
import type { Shooter, Variant } from '../logic/types';
import type { Zukan } from '../logic/zukan';
import { GameScreen } from './GameScreen';
import { SettingsPanel } from './SettingsPanel';
import {
  loadSettings,
  saveSettings,
  SHOOTER_LABEL,
  VARIANT_LABEL,
  variantFromUrl,
  writeUrlParams,
  type Settings,
} from './settings';
import { setSoundEnabled } from './sound';

type StartReason = Extract<LogPayload, { type: 'problem_start' }>['reason'];

export function App() {
  const [variant, setVariant] = useState<Variant>(() => variantFromUrl() ?? 'A');
  const [stage, setStage] = useState(1);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  // 図鑑はこのセッションの間だけ（再読み込みで消える）
  const zukan = useRef<Zukan>(new Map());
  // 問題を作り直すたびに増やして GameScreen を新しくする
  const [session, setSession] = useState({ n: 0, reason: 'first' as StartReason });

  useEffect(() => writeUrlParams(variant, settings.shooter), [variant, settings.shooter]);
  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
  }, [settings]);

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
    if (variant !== 'A') restartWith('switch');
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
    <div className="app">
      <header className="topbar">
        <div className="title">さんすう射的 <span className="tag">試作</span></div>
        <div className="seg variant-switch">
          {(['A', 'B', 'C'] as Variant[]).map((v) => (
            <button key={v} className={v === variant ? 'on' : ''} onClick={() => changeVariant(v)}>
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>
        <div className={`seg shooter-switch ${variant === 'A' ? 'disabled' : ''}`} title={variant === 'A' ? 'A はタップ式なので射撃タイプはありません' : '射撃タイプ'}>
          {(['gun', 'sling'] as Shooter[]).map((sh) => (
            <button key={sh} className={sh === settings.shooter ? 'on' : ''} disabled={variant === 'A'} onClick={() => changeShooter(sh)}>
              {SHOOTER_LABEL[sh]}
            </button>
          ))}
        </div>
        <div className="where">
          ステージ{stage}・{Math.min(index, problems.length - 1) + 1}問め
        </div>
        <button className="gear" onClick={() => setShowSettings(true)} aria-label="設定">
          ⚙️
        </button>
      </header>
      <GameScreen
        key={`${session.n}-${variant}-${variant === 'A' ? 'tap' : settings.shooter}-${problem.id}`}
        problem={problem}
        variant={variant}
        settings={settings}
        zukan={zukan.current}
        startReason={session.reason}
        onNext={next}
      />
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
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
