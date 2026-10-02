import type { Variant } from '../logic/types';

export interface Settings {
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
  /** 今の式を画面に出すか */
  showExpression: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  assistStrength: 1,
  assistInC: false,
  swayAmplitude: 12,
  cSizeScale: 1,
  cMoveSpeed: 1,
  showExpression: true,
  sound: true,
};

const KEY = 'shateki-settings-v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // 保存できない環境でも既定値で動く
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 無視
  }
}

export function isVariant(v: unknown): v is Variant {
  return v === 'A' || v === 'B' || v === 'C';
}

export function variantFromUrl(): Variant | null {
  const v = new URLSearchParams(location.search).get('variant')?.toUpperCase();
  return isVariant(v) ? v : null;
}

export function writeVariantToUrl(v: Variant): void {
  const url = new URL(location.href);
  url.searchParams.set('variant', v);
  history.replaceState(null, '', url);
}

export const VARIANT_LABEL: Record<Variant, string> = {
  A: 'A タップ',
  B: 'B ねらう',
  C: 'C リスク',
};
