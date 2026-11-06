import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import { shooterLabel } from './StageSelect';

describe('マップの問題の下に出す射撃タイプの名前', () => {
  it('A はタップ。ほかは今の設定の射撃タイプ', () => {
    expect(shooterLabel('A', { ...DEFAULT_SETTINGS, shooter: 'sling' })).toBe('タップ');
    expect(shooterLabel('B', { ...DEFAULT_SETTINGS, shooter: 'ring' })).toBe('輪投げ');
    expect(shooterLabel('C', { ...DEFAULT_SETTINGS, shooter: 'sling' })).toBe('パチンコ');
  });

  it('D・E で輪投げが選ばれていたら、遊ぶときと同じくコルク銃', () => {
    expect(shooterLabel('D', { ...DEFAULT_SETTINGS, shooter: 'ring' })).toBe('コルク銃');
    expect(shooterLabel('E', { ...DEFAULT_SETTINGS, shooter: 'ring' })).toBe('コルク銃');
  });
});
