import { useSyncExternalStore } from 'react';
import { MAX_VISIBLE, MIN_VISIBLE } from '../logic/lane';
import { RISE_POSITIONS } from '../logic/rise';
import { COURSE, courseStage, nodeAt, UNIT_LABEL, type NodeRef } from '../logic/course';
import { problemById } from '../logic/problems';
import type { Shooter } from '../logic/types';
import { clearLog, downloadLog, getLogCount, getLogLevel, getLogUsage, subscribeLog } from './logStore';
import { DEFAULT_SETTINGS, playSettings, SHOOTER_LABEL, SHOOTERS, shooterAllowed, shooterOf, VARIANT_LABEL, type Settings } from './settings';

interface Props {
  /** いまの問題（コースの中の位置） */
  current: NodeRef;
  settings: Settings;
  onShooter: (s: Shooter) => void;
  onProblem: (ref: NodeRef) => void;
  onSettings: (s: Settings) => void;
  onClose: () => void;
  /** つぎの人へ（新しい人として記録し、図鑑を空にして最初から） */
  onNextPlayer: () => void;
  /** 展示モード：スタッフ用の項目（あそぶもの・ログ）だけを出し、細かい調整は隠す */
  exhibit: boolean;
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

export function SettingsPanel({ current, settings, onShooter, onProblem, onSettings, onClose, onNextPlayer, exhibit }: Props) {
  const logCount = useSyncExternalStore(subscribeLog, getLogCount);
  const logUsage = useSyncExternalStore(subscribeLog, getLogUsage);
  const logLevel = useSyncExternalStore(subscribeLog, getLogLevel);
  const node = nodeAt(current);
  const variant = node?.variant ?? 'A';
  // 展示モードでは射撃タイプは問題ごとに決まっていて、ここでは変えられない（#46）
  const fixedShooter = node ? shooterOf(variant, playSettings(node, settings, true)) : 'tap';
  const nodes = courseStage(current.stage)?.nodes ?? [];
  const update = (patch: Partial<Settings>) => onSettings({ ...settings, ...patch });

  return (
    <div className="overlay settings-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`panel settings ${exhibit ? 'exhibit' : ''}`}>
        <div className="settings-head">
          <b>{exhibit ? 'スタッフ用（展示モード）' : '設定（開発用）'}</b>
          <button className="btn small" onClick={onClose}>
            とじる
          </button>
        </div>

        <section className="staff">
          <h3>遊ぶ人</h3>
          <div className="row">
            <button
              className="btn small"
              onClick={() => {
                if (window.confirm('つぎの人に替えます。図鑑を空にして、マップ（ステージ1）にもどります。よろしいですか？')) onNextPlayer();
              }}
            >
              つぎの人へ
            </button>
            <span className="row-note">新しい人として記録します（図鑑を空にして、マップから）</span>
          </div>
        </section>

        <section className="staff">
          <h3>あそぶもの</h3>
          <div className="row">
            <span className="row-label">射撃タイプ（B〜E）</span>
            {exhibit ? (
              <span className="row-note">
                展示モードでは問題ごとに決まっています（いまの問題：{fixedShooter === 'tap' ? 'タップ' : SHOOTER_LABEL[fixedShooter]}）
              </span>
            ) : (
              <div className="seg">
                {SHOOTERS.map((sh) => (
                  <button
                    key={sh}
                    className={sh === settings.shooter ? 'on' : ''}
                    disabled={variant !== 'A' && !shooterAllowed(variant, sh)}
                    onClick={() => onShooter(sh)}
                  >
                    {SHOOTER_LABEL[sh]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="row">
            <span className="row-label">ステージ</span>
            <div className="seg">
              {COURSE.map((c) => (
                <button key={c.stage} className={c.stage === current.stage ? 'on' : ''} onClick={() => onProblem({ stage: c.stage, index: 0 })}>
                  ステージ{c.stage}（{UNIT_LABEL[c.unit]}）
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="row-label">問題</span>
            <div className="seg">
              {nodes.map((n, i) => (
                <button key={n.problemId} className={i === current.index ? 'on' : ''} onClick={() => onProblem({ stage: current.stage, index: i })} title={n.problemId}>
                  {current.stage}-{i + 1}（{VARIANT_LABEL[n.variant]}・目標{problemById(n.problemId)?.goal}）
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
          <Slider label="照準の揺れ（B〜E）" value={settings.swayAmplitude} min={0} max={40} step={2} onChange={(v) => update({ swayAmplitude: v })} />
        </section>

        <section>
          <h3>パチンコ（B〜E）</h3>
          <Slider label="弾の速さ" value={settings.slingSpeed} min={300} max={1600} step={50} onChange={(v) => update({ slingSpeed: v })} note="遅いほど、動く的は先を読んで撃つ必要がある" />
          <div className="row">
            <span className="row-label">ガイドの比較</span>
            <div className="seg">
              {[{ value: 120, label: '短い（120）' }, { value: 600, label: '従来（600）' }, { value: 1000, label: '長い（1000）' }].map(({ value, label }) => (
                <button key={value} className={settings.slingGuide === value ? 'on' : ''} onClick={() => update({ slingGuide: value })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Slider label="ガイドの長さ" value={settings.slingGuide} min={0} max={2000} step={20} onChange={(v) => update({ slingGuide: v })} note="0でガイドなし。長いほど先の道すじが見える。壁ではね返る道すじも表示（動く的への命中は予測しない）" />
          <label className="row">
            <span className="row-label">左右の壁ではね返る</span>
            <input type="checkbox" checked={settings.slingBounce} onChange={(e) => update({ slingBounce: e.target.checked })} />
          </label>
        </section>

        <section>
          <h3>輪投げ（B・C）</h3>
          <Slider label="飛んでいる時間（秒）" value={settings.ringTime} min={0.3} max={1.6} step={0.1} onChange={(v) => update({ ringTime: v })} note="長いほど輪がゆっくり飛ぶ。落ちる場所は変わらない" />
          <label className="row">
            <span className="row-label">落ちる場所を見せる</span>
            <input type="checkbox" checked={settings.ringShowLanding} onChange={(e) => update({ ringShowLanding: e.target.checked })} />
            <span className="row-note">オフにすると、引っ張っている間の道すじと落ちる場所を出さない。距離は自分で感覚をつかむ</span>
          </label>
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
          <h3>D：ながれる</h3>
          <Slider
            label="レーンの速さ"
            value={settings.laneSpeed}
            min={40}
            max={300}
            step={10}
            onChange={(v) => update({ laneSpeed: v })}
            note={`画面の端から端まで約 ${Math.round(1000 / settings.laneSpeed)} 秒`}
          />
          <Slider
            label="画面に出る的の数"
            value={settings.laneVisible}
            min={MIN_VISIBLE}
            max={MAX_VISIBLE}
            step={1}
            onChange={(v) => update({ laneVisible: v })}
            note="画面の外にもう1つ置き場所がある"
          />
          <label className="row">
            <span className="row-label">救済を使う</span>
            <input type="checkbox" checked={settings.laneAssist} onChange={(e) => update({ laneAssist: e.target.checked })} />
            <span className="row-note">届くために役立つ札がしばらく出ていなければ、次にそれを流す</span>
          </label>
          <Slider
            label="救済までの秒数"
            value={settings.laneAssistSec}
            min={2}
            max={20}
            step={1}
            onChange={(v) => update({ laneAssistSec: v })}
          />
          <label className="row">
            <span className="row-label">札の看板を出す（D・E）</span>
            <input type="checkbox" checked={settings.laneBoard} onChange={(e) => update({ laneBoard: e.target.checked })} />
            <span className="row-note">左の余白に、この問題の札を全部出す（余白が狭い画面では出ない）</span>
          </label>
        </section>

        <section>
          <h3>E：おきあがる</h3>
          <Slider
            label="立っている的の数"
            value={settings.riseStanding}
            min={3}
            max={RISE_POSITIONS - 1}
            step={1}
            onChange={(v) => update({ riseStanding: v })}
            note={`置き場所は ${RISE_POSITIONS} つ。残りは空きで、新しい的はそこに起き上がる`}
          />
          <Slider
            label="起き上がるまでの秒数"
            value={settings.riseDelay}
            min={0.3}
            max={3}
            step={0.1}
            onChange={(v) => update({ riseDelay: v })}
            note="当てた・いれかえたあと、別の場所に新しい的が起き上がるまで"
          />
        </section>

        <section>
          <h3>共通</h3>
          <label className="row">
            <span className="row-label">はじめの手引き</span>
            <input type="checkbox" checked={settings.tutorial} onChange={(e) => update({ tutorial: e.target.checked })} />
            <span className="row-note">マップから 1-1 までの手引きと、パチンコ・輪投げの最初の狙い方の手引き。遊ぶ人ごとに1回だけ出る</span>
          </label>
          <label className="row">
            <span className="row-label">いまの式を表示</span>
            <input type="checkbox" checked={settings.showExpression} onChange={(e) => update({ showExpression: e.target.checked })} />
          </label>
          <label className="row">
            <span className="row-label">効果音</span>
            <input type="checkbox" checked={settings.sound} onChange={(e) => update({ sound: e.target.checked })} />
          </label>
          <label className="row">
            <span className="row-label">BGM</span>
            <input type="checkbox" checked={settings.bgm} onChange={(e) => update({ bgm: e.target.checked })} />
            <span className="row-note">素材があるときに再生</span>
          </label>
          <Slider label="BGMの音量" value={settings.bgmVolume} min={0} max={1} step={0.05} onChange={(v) => update({ bgmVolume: v })} />
          <div className="row">
            <button className="btn small" onClick={() => onSettings({ ...DEFAULT_SETTINGS, shooter: settings.shooter })}>
              設定を元にもどす
            </button>
          </div>
        </section>

        <section className="staff">
          <h3>ログ（{logCount}件）</h3>
          <div className="row">
            <span className="row-label">保存の量（目安）</span>
            <span className={logLevel === 'ok' ? '' : 'log-warn'}>{Math.round(logUsage * 100)}%</span>
          </div>
          {logLevel === 'warn' && (
            <p className="log-warn">
              ログの保存がいっぱいに近づいています。ダウンロードしてから、展示モードを外した画面で「ログを消去」してください。
            </p>
          )}
          {logLevel === 'failed' && (
            <p className="log-warn">
              ログを保存できていません。今すぐダウンロードしてください（画面を閉じると、保存できていない分が消えます）。
            </p>
          )}
          <div className="row">
            <button className="btn small" onClick={downloadLog} disabled={logCount === 0}>
              JSONをダウンロード
            </button>
            {/* 展示中に誤って消さないよう、展示モードでは出さない（消すのは展示の前に、展示モードを外した画面で） */}
            {!exhibit && (
              <button
                className="btn small danger"
                onClick={() => {
                  if (window.confirm(`ログ ${logCount} 件を消去します。よろしいですか？`)) clearLog();
                }}
                disabled={logCount === 0}
              >
                ログを消去
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
