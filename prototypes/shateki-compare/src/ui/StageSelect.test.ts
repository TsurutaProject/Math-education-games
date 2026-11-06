import { describe, expect, it } from 'vitest';
import { mapLabel, stageNodes } from './StageSelect';

describe('mapLabel（マップの番号）', () => {
  it('ステージ（＝バリエーション）の順番と、その中の何問目か', () => {
    const nodes = stageNodes('B');
    expect(mapLabel('B', nodes[0].problem.id)).toBe('2-1');
    expect(mapLabel('B', nodes[3].problem.id)).toBe('2-4');
    expect(mapLabel('E', stageNodes('E')[0].problem.id)).toBe('5-1');
  });
});
