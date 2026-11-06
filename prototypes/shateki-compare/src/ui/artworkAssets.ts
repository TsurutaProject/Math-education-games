import type { Op } from '../logic/types';

export const artworkUrl = (name: string) => `${import.meta.env.BASE_URL}images/festival/${name}.png`;
/** 画像自体は変更せず、透明な余白を除く表示範囲だけを定義する。 */
export const SPRITES = {
  'target-red': [676, 162, 2156, 2156],
  'target-blue': [676, 162, 2156, 2156],
  'target-pink': [676, 162, 2156, 2156],
  'target-purple': [676, 162, 2156, 2156],
  'target-yellow': [676, 162, 2156, 2156],
  gun: [1680, 1478, 167, 1003],
  sling: [1052, 904, 1404, 1577],
  'sling-ball': [1289, 867, 928, 928],
  cork: [1300, 1411, 110, 141],
  ammo: [2543, 1635, 681, 681],
} as const;
export type SpriteName = keyof typeof SPRITES;
export const OP_ARTWORK: Record<Op, SpriteName> = { '+': 'target-blue', '-': 'target-pink', '*': 'target-purple', '/': 'target-yellow' };
export const OP_INK: Record<Op, string> = { '+': '#285987', '-': '#a93669', '*': '#63518e', '/': '#806819' };
