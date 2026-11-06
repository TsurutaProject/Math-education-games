import { firstRefOfVariant, mapNo, parseMapNo, type NodeRef } from '../logic/course';
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
  /** 輪投げの輪が飛んでいる時間（秒） */
  ringTime: number;
  /** 輪投げの落ちる場所（と山なりの道すじ）を引っ張っている間に見せるか */
  ringShowLanding: boolean;
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
  /** E で立っている的の数（置き場所は8つ。残りは空き） */
  riseStanding: number;
  /** E で、当てた・いれかえたあと、別の場所に新しい的が起き上がるまでの秒数 */
  riseDelay: number;
  /** 今の式を画面に出すか */
  showExpression: boolean;
  sound: boolean;
  bgm: boolean;
  bgmVolume: number;
}

export const DEFAULT_SETTINGS: Settings = {
  shooter: 'gun',
  slingSpeed: 800,
  slingGuide: 600,
  slingBounce: true,
  ringTime: 0.8,
  ringShowLanding: true,
  assistStrength: 1,
  assistInC: true,
  swayAmplitude: 0,
  cSizeScale: 1,
  cMoveSpeed: 1,
  laneSpeed: 120,
  laneVisible: 4,
  laneAssist: true,
  laneAssistSec: 8,
  riseStanding: 6,
  riseDelay: 1,
  showExpression: true,
  sound: true,
  bgm: false,
  bgmVolume: 0.25,
};

const KEY = 'shateki-settings-v1';

export function loadSettings(): Settings {
  let s = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...upgradeSaved(JSON.parse(raw)) };
  } catch {
    // 保存できない環境でも既定値で動く
  }
  // URL の ?shooter= が保存した設定より優先
  const fromUrl = shooterFromParam(new URLSearchParams(location.search).get('shooter'));
  if (fromUrl) s.shooter = fromUrl;
  return s;
}

export function isShooter(v: unknown): v is Shooter {
  return v === 'gun' || v === 'sling' || v === 'ring';
}

/** URL・保存した設定の射撃タイプを読む。前の名前の catapult は ring として読む。 */
export function shooterFromParam(v: unknown): Shooter | null {
  if (v === 'catapult') return 'ring';
  return isShooter(v) ? v : null;
}

/** 前の形で保存した設定を今の形にする（catapult → ring、catapultTime → ringTime など）。 */
export function upgradeSaved(saved: Record<string, unknown>): Partial<Settings> {
  const { catapultTime, catapultShowLanding, ...rest } = saved;
  const out: Record<string, unknown> = { ...rest };
  if (catapultTime !== undefined && out.ringTime === undefined) out.ringTime = catapultTime;
  if (catapultShowLanding !== undefined && out.ringShowLanding === undefined) out.ringShowLanding = catapultShowLanding;
  if ('shooter' in out) {
    const shooter = shooterFromParam(out.shooter);
    if (shooter) out.shooter = shooter;
    else delete out.shooter;
  }
  return out as Partial<Settings>;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 無視
  }
}

export function isVariant(v: unknown): v is Variant {
  return v === 'A' || v === 'B' || v === 'C' || v === 'D' || v === 'E';
}

export function variantFromUrl(search: string = location.search): Variant | null {
  const v = new URLSearchParams(search).get('variant')?.toUpperCase();
  return isVariant(v) ? v : null;
}

/**
 * URL で指定した問題（例 ?node=2-3 ＝ステージ 2 の 3 問目）。
 * 前の形の ?variant=（バリエーションごとのマップ）は、その遊び方がコースで最初に出てくる問題として読む。
 */
export function refFromUrl(search: string = location.search): NodeRef | null {
  const ref = parseMapNo(new URLSearchParams(search).get('node'));
  if (ref) return ref;
  const v = variantFromUrl(search);
  return v ? firstRefOfVariant(v) : null;
}

/**
 * 展示モードか（URL に ?mode=exhibit）。展示では子どもが切り替えや設定を触れないようにする。
 * URL で決めるので、再読み込みしても展示モードのまま（writeUrlParams はほかの項目を残す）。
 */
export function exhibitFromUrl(search: string = location.search): boolean {
  return new URLSearchParams(search).get('mode') === 'exhibit';
}

/**
 * 展示モードで、スタッフ用の設定パネルを開くキーか（Ctrl + Shift + S）。
 * Mac でも Control キー。かな入力でも同じように効くよう、文字ではなくキーの位置（code）で見る。
 */
export function isStaffKey(e: Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey' | 'code'>): boolean {
  return e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === 'KeyS';
}

export function writeUrlParams(ref: NodeRef, shooter: Shooter): void {
  const url = new URL(location.href);
  url.searchParams.delete('variant');
  url.searchParams.set('node', mapNo(ref));
  url.searchParams.set('shooter', shooter);
  history.replaceState(null, '', url);
}

export const SHOOTER_LABEL: Record<Shooter, string> = {
  gun: 'コルク銃',
  sling: 'パチンコ',
  ring: '輪投げ',
};

export const SHOOTERS: Shooter[] = ['gun', 'sling', 'ring'];

/** 提灯の下に出す操作の説明。空白も数えて10文字以内。 */
export const INSTRUCTION: Record<'tap' | Shooter, string> = {
  tap: 'まとを タップ',
  gun: 'ねらって はなす',
  sling: 'ひっぱって はなす',
  ring: 'ひっぱって なげる',
};

/** そのバリエーションで選べる射撃タイプか。D・E は的が流れる・起き上がる仕組みなので、棒が動かない輪投げは使わない。 */
export function shooterAllowed(v: Variant, sh: Shooter): boolean {
  if (v === 'A') return false;
  return !((v === 'D' || v === 'E') && sh === 'ring');
}

/**
 * 実際に使う射撃タイプ。ログ・図鑑の区別にも使う。A はタップなので射撃タイプなし。
 * D・E で輪投げが選ばれていたら、コルク銃にする。
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
  E: 'E おきあがる',
};

export const VARIANTS: Variant[] = ['A', 'B', 'C', 'D', 'E'];
