import { describe, expect, it } from 'vitest';
import { exhibitFromUrl, isStaffKey, shooterFromParam, upgradeSaved } from './settings';

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

describe('輪投げの名前（catapult → ring）', () => {
  it('URL の射撃タイプは、前の名前の catapult も ring として読む', () => {
    expect(shooterFromParam('ring')).toBe('ring');
    expect(shooterFromParam('catapult')).toBe('ring');
    expect(shooterFromParam('gun')).toBe('gun');
    expect(shooterFromParam('bow')).toBeNull();
    expect(shooterFromParam(null)).toBeNull();
  });

  it('前の形で保存した設定を、今の名前に引き継ぐ', () => {
    expect(upgradeSaved({ shooter: 'catapult', catapultTime: 1.2, catapultShowLanding: false, sound: false })).toEqual({
      shooter: 'ring',
      ringTime: 1.2,
      ringShowLanding: false,
      sound: false,
    });
  });

  it('今の名前の値があれば、そちらを使う。知らない射撃タイプは捨てて既定に戻す', () => {
    expect(upgradeSaved({ catapultTime: 1.2, ringTime: 0.5 })).toEqual({ ringTime: 0.5 });
    expect(upgradeSaved({ shooter: 'bow' })).toEqual({});
  });
});
