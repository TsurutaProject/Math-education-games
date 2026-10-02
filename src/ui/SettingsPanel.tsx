import { useSyncExternalStore } from 'react';
import { problemsFor, setForVariant, stagesFor } from '../logic/problems';
import type { Variant } from '../logic/types';
import { clearLog, downloadLog, getLogCount, subscribeLog } from './logStore';
import { DEFAULT_SETTINGS, VARIANT_LABEL, type Settings } from './settings';

interface Props {
  variant: Variant;
  stage: number;
  index: number;
  settings: Settings;
  onVariant: (v: Variant) => void;
  onProblem: (stage: number, index: number) => void;
  onSettings: (s: Settings) => void;
  onClose: () => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  note?: string;
}) {
  return (
    <label className="row">
      <span className="row-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="row-value">{value}</span>
      {note && <span className="row-note">{note}</span>}
    </label>
  );
}

export function SettingsPanel({ variant, stage, index, settings, onVariant, onProblem, onSettings, onClose }: Props) {
  const logCount = useSyncExternalStore(subscribeLog, getLogCount);
  const set = setForVariant(variant);
  const stages = stagesFor(set);
  const problems = problemsFor(set, stage);
  const update = (patch: Partial<Settings>) => onSettings({ ...settings, ...patch });

  return (
    <div className="overlay settings-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel settings">
        <div className="settings-head">
          <b>設定（開発用）</b>
          <button className="btn small" onClick={onClose}>
            とじる
          </button>
        </div>

        <section>
          <h3>あそぶもの</h3>
          <div className="row">
            <span className="row-label">バリエーション</span>
            <div className="seg">
              {(['A', 'B', 'C'] as Variant[]).map((v) => (
                <button key={v} className={v === variant ? 'on' : ''} onClick={() => onVariant(v)}>
                  {VARIANT_LABEL[v]}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="row-label">ステージ</span>
            <div className="seg">
              {stages.map((s) => (
                <button key={s} className={s === stage ? 'on' : ''} onClick={() => onProblem(s, 0)}>
                  ステージ{s}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="row-label">問題</span>
            <div className="seg">
              {problems.map((p, i) => (
                <button key={p.id} className={i === index ? 'on' : ''} onClick={() => onProblem(stage, i)} title={p.id}>
                  {i + 1}（目標{p.goal}）
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3>B：狙う＋救済</h3>
          <Slider
            label="補正の強さ"
            value={settings.assistStrength}
            min={0}
            max={2}
            step={0.25}
            onChange={(v) => update({ assistStrength: v })}
            note="0=なし 1=標準（残り2発で×1.35、1発で×1.8）"
          />
          <Slider label="照準の揺れ（B・C）" value={settings.swayAmplitude} min={0} max={40} step={2} onChange={(v) => update({ swayAmplitude: v })} />
        </section>

        <section>
          <h3>C：リスクとリターン</h3>
          <Slider label="的の大きさ" value={settings.cSizeScale} min={0.6} max={1.5} step={0.05} onChange={(v) => update({ cSizeScale: v })} />
          <Slider label="移動の速さ" value={settings.cMoveSpeed} min={0} max={2.5} step={0.1} onChange={(v) => update({ cMoveSpeed: v })} note="0で止まる" />
          <label className="row">
            <span className="row-label">C にも補正を使う</span>
            <input type="checkbox" checked={settings.assistInC} onChange={(e) => update({ assistInC: e.target.checked })} />
          </label>
        </section>

        <section>
          <h3>共通</h3>
          <label className="row">
            <span className="row-label">いまの式を表示</span>
            <input type="checkbox" checked={settings.showExpression} onChange={(e) => update({ showExpression: e.target.checked })} />
          </label>
          <label className="row">
            <span className="row-label">効果音</span>
            <input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} />
          </label>
          <div className="row">
            <button className="btn small" onClick={() => onSettings({ ...DEFAULT_SETTINGS })}>
              設定を元にもどす
            </button>
          </div>
        </section>

        <section>
          <h3>ログ（{logCount}件）</h3>
          <div className="row">
            <button className="btn small" onClick={downloadLog} disabled={logCount === 0}>
              JSONをダウンロード
            </button>
            <button
              className="btn small danger"
              onClick={() => {
                if (window.confirm(`ログ ${logCount} 件を消去します。よろしいですか？`)) clearLog();
              }}
              disabled={logCount === 0}
            >
              ログを消去
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
