import { Artwork } from './Artwork';
import { FIELD_H, FIELD_W } from '../logic/hit';

/** 銃口の描画と、コルクの発射アニメーションで同じ座標を使う。 */
export const GUN_MUZZLE = { x: FIELD_W / 2, y: FIELD_H - 48 };

export function GunLayer() {
  return (
    <g className="gun" transform={`translate(${GUN_MUZZLE.x} ${GUN_MUZZLE.y})`} pointerEvents="none">
      <Artwork name="gun" x={-17} y={0} width={34} height={34 * 1003 / 167} />

    </g>
  );
}
