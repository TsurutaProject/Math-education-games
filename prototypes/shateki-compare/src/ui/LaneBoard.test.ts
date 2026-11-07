import { describe, expect, it } from 'vitest';
import { FIELD_H, FIELD_W } from '../logic/hit';
import { BOARD_W, boardHeight, boardPlace, MIN_BOARD_SCALE } from './LaneBoard';

const gunView = { x: 0, width: FIELD_W, height: FIELD_H };
const slingView = { x: -12, width: FIELD_W + 24, height: FIELD_H };

describe('D の札の看板の置き場所（#62）', () => {
  it('横長の画面では、左の余白にそのままの大きさで入る', () => {
    // 高さ 300px なら、フィールド 1000 は 300 / 620 × 1000 ≈ 484px。左右に (900 - 484) / 2 ≈ 208px ＝ 430 フィールド単位の余白
    const place = boardPlace({ width: 900, height: 300 }, gunView)!;
    expect(place.scale).toBe(1);
    // 看板の右の端は、フィールドの左の端より左
    expect(place.x + BOARD_W * place.scale).toBeLessThan(0);
  });

  it('看板は、余白の中（画面の左の端より右）に収まる', () => {
    const size = { width: 900, height: 300 };
    const place = boardPlace(size, gunView)!;
    const px = size.height / FIELD_H;
    const leftEdge = -(size.width / px - FIELD_W) / 2;
    expect(place.x).toBeGreaterThan(leftEdge);
  });

  it('余白が少し狭ければ、縮めて入れる', () => {
    // 余白 ≈ 250 単位：そのままの大きさ（240 + すき間）は入らない
    const height = 300;
    const width = (FIELD_W + 2 * 250) * (height / FIELD_H);
    const place = boardPlace({ width, height }, gunView)!;
    expect(place.scale).toBeLessThan(1);
    expect(place.scale).toBeGreaterThanOrEqual(MIN_BOARD_SCALE);
  });

  it('余白が狭い画面（縦長・4:3 など）では出さない', () => {
    expect(boardPlace({ width: 800, height: 834 }, gunView)).toBeNull();
    expect(boardPlace({ width: 1024, height: 600 }, gunView)).toBeNull();
  });

  it('まだ大きさがわからないときは出さない', () => {
    expect(boardPlace({ width: 0, height: 0 }, gunView)).toBeNull();
  });

  it('パチンコは、壁の外側に置く', () => {
    const place = boardPlace({ width: 900, height: 300 }, slingView)!;
    expect(place.x + BOARD_W * place.scale).toBeLessThan(slingView.x);
  });

  it('看板の高さは札の数で変わる（2 列）', () => {
    expect(boardHeight(6)).toBe(boardHeight(5));
    expect(boardHeight(6)).toBeGreaterThan(boardHeight(4));
  });
});
