import { describe, expect, it } from 'vitest';
import { exhibitFromUrl, isStaffKey } from './settings';

describe('exhibitFromUrl（展示モード）', () => {
  it('?mode=exhibit のときだけ展示モード', () => {
    expect(exhibitFromUrl('?mode=exhibit')).toBe(true);
    expect(exhibitFromUrl('?variant=B&mode=exhibit&shooter=gun')).toBe(true);
  });

  it('付いていない・ほかの値のときは展示モードにしない', () => {
    expect(exhibitFromUrl('')).toBe(false);
    expect(exhibitFromUrl('?variant=B')).toBe(false);
    expect(exhibitFromUrl('?mode=dev')).toBe(false);
  });
});

describe('isStaffKey（スタッフ用パネルを開くキー）', () => {
  const key = (over: Partial<Parameters<typeof isStaffKey>[0]> = {}) => ({
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
    metaKey: false,
    code: 'KeyS',
    ...over,
  });

  it('Ctrl + Shift + S で開く', () => {
    expect(isStaffKey(key())).toBe(true);
  });

  it('ほかのキーや、足りない・多い組み合わせでは開かない', () => {
    expect(isStaffKey(key({ code: 'KeyA' }))).toBe(false);
    expect(isStaffKey(key({ shiftKey: false }))).toBe(false);
    expect(isStaffKey(key({ ctrlKey: false }))).toBe(false);
    expect(isStaffKey(key({ altKey: true }))).toBe(false);
    expect(isStaffKey(key({ metaKey: true }))).toBe(false);
  });
});
