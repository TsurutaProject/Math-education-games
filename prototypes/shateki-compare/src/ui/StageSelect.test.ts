import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import { shooterLabel } from './StageSelect';

describe('マップの問題の下に出す射撃タイプの名前', () => {
  it('ふだんの画面：A はタップ。ほかは今の設定の射撃タイプ（表の射撃タイプは使わない）', () => {
    expect(shooterLabel({ variant: 'A', shooter: null }, { ...DEFAULT_SETTINGS, shooter: 'sling' }, false)).toBe('タップ');
    expect(shooterLabel({ variant: 'B', shooter: 'gun' }, { ...DEFAULT_SETTINGS, shooter: 'ring' }, false)).toBe('輪投げ');
    expect(shooterLabel({ variant: 'C', shooter: 'ring' }, { ...DEFAULT_SETTINGS, shooter: 'sling' }, false)).toBe('パチンコ');
  });

  it('ふだんの画面：D・E で輪投げが選ばれていたら、遊ぶときと同じくコルク銃', () => {
    expect(shooterLabel({ variant: 'D', shooter: 'sling' }, { ...DEFAULT_SETTINGS, shooter: 'ring' }, false)).toBe('コルク銃');
    expect(shooterLabel({ variant: 'E', shooter: 'sling' }, { ...DEFAULT_SETTINGS, shooter: 'ring' }, false)).toBe('コルク銃');
  });

  it('展示モード（#46）：設定にかかわらず、表で問題ごとに決めた射撃タイプ。A はタップ', () => {
    const s = { ...DEFAULT_SETTINGS, shooter: 'gun' as const };
    expect(shooterLabel({ variant: 'A', shooter: null }, s, true)).toBe('タップ');
    expect(shooterLabel({ variant: 'C', shooter: 'ring' }, s, true)).toBe('輪投げ');
    expect(shooterLabel({ variant: 'D', shooter: 'sling' }, s, true)).toBe('パチンコ');
  });
});
