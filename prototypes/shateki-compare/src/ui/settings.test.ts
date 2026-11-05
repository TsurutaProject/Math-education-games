import { describe, expect, it } from 'vitest';
import { exhibitFromUrl } from './settings';

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
