import { Artwork } from './Artwork';
interface Props {
  x: number;
  y: number;
  shots: number;
  shotsLeft: number;
}

/** 射撃具の横に表示する共通の残り弾数。 */
export function AmmoLayer({ x, y, shots, shotsLeft }: Props) {
  return (
      <g transform={`translate(${x} ${y})`} pointerEvents="none" role="img" aria-label={`のこり ${shotsLeft} 発、全部で ${shots} 発`}>
        <rect x={52} y={-12} width={158} height={50} rx={12} className="gun-ammo-panel" />
        <text x={64} y={5} className="gun-ammo-label">のこりの たま</text>
        <text x={64} y={29} className="gun-ammo-value">{shotsLeft} / {shots}</text>
        {Array.from({ length: shots }, (_, index) => (
          <g key={index} opacity={index < shotsLeft ? 1 : .2}>
            <Artwork name="ammo" x={124 + index * 16} y={15} width={13} height={13} />
          </g>
        ))}
      </g>
  );
}
