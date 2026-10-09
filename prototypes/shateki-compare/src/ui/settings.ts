import type { Shooter, Variant } from '../logic/types';

export interface Settings {
  /** B・C の射撃タイプ */
  shooter: Shooter;
  /** パチンコの弾の速さ（フィールド単位/秒） */
  slingSpeed: number;
  /** パチンコのねらいガイドの長さ（フィールド単位） */
  slingGuide: number;
  /** パチンコの弾が左右の壁ではね返るか */
  slingBounce: boolean;
  /** カタパルトの弾がいちばん遠くまで飛ぶのにかかる時間（秒） */
  catapultTime: number;
  /** カタパルトの着地点（と山なりの道すじ）を引っ張っている間に見せるか */
  catapultShowLanding: boolean;
  /** B の当たり判定補正の強さ（0 = なし、1 = 標準、2 = 強い） */
  assistStrength: number;
  /** C でも補正を使うか */
  assistInC: boolean;
  /** B/C の照準の揺れ幅（フィールド単位） */
  swayAmplitude: number;
  /** C の的の大きさの倍率 */
  cSizeScale: number;
  /** C の動く的の速さの倍率（0 で止まる） */
  cMoveSpeed: number;
  /** D のレーンが流れる速さ（フィールド単位/秒） */
  laneSpeed: number;
  /** D で画面に同時に出す的の数（3〜6） */
  laneVisible: number;
  /** D の救済（役立つ札がしばらく出ていなければ流す）を使うか */
  laneAssist: boolean;
  /** D の救済：役立つ札が何秒出ていなければ流すか */
  laneAssistSec: number;
  /** 今の式を画面に出すか */
  showExpression: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  shooter: 'gun',
  slingSpeed: 800,
  slingGuide: 260,
  slingBounce: true,
  catapultTime: 0.8,
  catapultShowLanding: true,
  assistStrength: 1,
  assistInC: false,
  swayAmplitude: 12,
  cSizeScale: 1,
  cMoveSpeed: 1,
  laneSpeed: 120,
  laneVisible: 4,
  laneAssist: true,
  laneAssistSec: 8,
  showExpression: true,
  sound: true,
};

const KEY = 'shateki-settings-v1';

export function loadSettings(): Settings {
  let s = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...JSON.parse(raw) };
  } catch {
    // 保存できない環境でも既定値で動く
  }
  // URL の ?shooter= が保存した設定より優先
  const fromUrl = new URLSearchParams(location.search).get('shooter');
  if (isShooter(fromUrl)) s.shooter = fromUrl;
  return s;
}

export function isShooter(v: unknown): v is Shooter {
  return v === 'gun' || v === 'sling' || v === 'catapult';
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 無視
  }
}

export function isVariant(v: unknown): v is Variant {
  return v === 'A' || v === 'B' || v === 'C' || v === 'D';
}

export function variantFromUrl(): Variant | null {
  const v = new URLSearchParams(location.search).get('variant')?.toUpperCase();
  return isVariant(v) ? v : null;
}

export function writeUrlParams(v: Variant, shooter: Shooter): void {
  const url = new URL(location.href);
  url.searchParams.set('variant', v);
  url.searchParams.set('shooter', shooter);
  history.replaceState(null, '', url);
}

export const SHOOTER_LABEL: Record<Shooter, string> = {
  gun: 'コルク銃',
  sling: 'パチンコ',
  catapult: 'カタパルト',
};

export const SHOOTERS: Shooter[] = ['gun', 'sling', 'catapult'];

/** そのバリエーションで選べる射撃タイプか。D はレーンが1本なので、奥と手前の2段が前提のカタパルトは使わない。 */
export function shooterAllowed(v: Variant, sh: Shooter): boolean {
  if (v === 'A') return false;
  return !(v === 'D' && sh === 'catapult');
}

/**
 * 実際に使う射撃タイプ。ログ・図鑑の区別にも使う。A はタップなので射撃タイプなし。
 * D でカタパルトが選ばれていたら、コルク銃にする。
 */
export function shooterOf(v: Variant, s: Settings): 'tap' | Shooter {
  if (v === 'A') return 'tap';
  return shooterAllowed(v, s.shooter) ? s.shooter : 'gun';
}

export const VARIANT_LABEL: Record<Variant, string> = {
  A: 'A タップ',
  B: 'B ねらう',
  C: 'C リスク',
  D: 'D ながれる',
};

export const VARIANTS: Variant[] = ['A', 'B', 'C', 'D'];
