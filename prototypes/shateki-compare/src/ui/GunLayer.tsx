import { FIELD_H, FIELD_W } from '../logic/hit';

/** 銃口の描画と、コルクの発射アニメーションで同じ座標を使う。 */
export const GUN_MUZZLE = { x: FIELD_W / 2, y: FIELD_H - 48 };

export function GunLayer() {
  return (
    <g className="gun" transform={`translate(${GUN_MUZZLE.x} ${GUN_MUZZLE.y})`} pointerEvents="none">
      {/* 銃身は下端へ続き、銃口が画面の中に出ている。 */}
      <rect x={-16} y={0} width={32} height={80} rx={8} className="gun-barrel" />
      <rect x={-21} y={30} width={42} height={50} rx={7} className="gun-grip" />
      <line x1={-9} x2={-9} y1={9} y2={28} className="gun-shine" />
      <ellipse rx={16} ry={6} className="gun-rim" />
      <ellipse rx={10} ry={3} className="gun-opening" />

    </g>
  );
}
