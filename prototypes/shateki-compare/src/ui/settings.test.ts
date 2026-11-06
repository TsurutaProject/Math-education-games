import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, exhibitFromUrl, isStaffKey, playSettings, refFromUrl, shooterFromParam, shooterOf, upgradeSaved } from './settings';

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

describe('refFromUrl（URL で問題を指定する）', () => {
  it('?node=2-3 はステージ 2 の 3 問目', () => {
    expect(refFromUrl('?node=2-3&shooter=gun')).toEqual({ stage: 2, index: 2 });
  });

  it('前の形の ?variant= は、その遊び方がコースで最初に出てくる問題', () => {
    expect(refFromUrl('?variant=b')).toEqual({ stage: 3, index: 0 });
    expect(refFromUrl('?variant=E&mode=exhibit')).toEqual({ stage: 1, index: 5 });
  });

  it('?node= が先。コースにない番号・指定なしは null', () => {
    expect(refFromUrl('?node=1-2&variant=E')).toEqual({ stage: 1, index: 1 });
    expect(refFromUrl('?node=9-9')).toBeNull();
    expect(refFromUrl('')).toBeNull();
  });
});

describe('playSettings（展示モードで射撃タイプを問題ごとに固定する #46）', () => {
  const s = { ...DEFAULT_SETTINGS, shooter: 'ring' as const };

  it('展示モードでは、表で決めた射撃タイプにする（設定・URL の射撃タイプは使わない）', () => {
    expect(playSettings({ shooter: 'sling' }, s, true).shooter).toBe('sling');
    expect(shooterOf('D', playSettings({ shooter: 'gun' }, s, true))).toBe('gun');
  });

  it('展示モードの A は表の射撃タイプがないので、タップのまま', () => {
    expect(shooterOf('A', playSettings({ shooter: null }, s, true))).toBe('tap');
  });

  it('ふだんの画面では設定のまま（同じオブジェクトを返す）', () => {
    expect(playSettings({ shooter: 'sling' }, s, false)).toBe(s);
  });

  it('射撃タイプのほかの設定は変えない', () => {
    const custom = { ...s, slingSpeed: 1234 };
    expect(playSettings({ shooter: 'gun' }, custom, true)).toEqual({ ...custom, shooter: 'gun' });
  });
});
