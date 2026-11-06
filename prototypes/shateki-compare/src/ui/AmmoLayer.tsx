import { Artwork } from './Artwork';
interface Props {
  x: number;
  y: number;
  shots: number;
  shotsLeft: number;
  /** 弾の絵。コルク銃はコルク、パチンコは球、輪投げは輪 */
  kind: 'cork' | 'ball' | 'ring';
}

/** 射撃具の横に表示する共通の残り弾数。 */
export function AmmoLayer({ x, y, shots, shotsLeft, kind }: Props) {
  return (
      <g transform={`translate(${x} ${y})`} pointerEvents="none" role="img" aria-label={`のこり ${shotsLeft} 発、全部で ${shots} 発`}>
        <rect x={52} y={-12} width={158} height={50} rx={12} className="gun-ammo-panel" />
        <text x={64} y={5} className="gun-ammo-label">{kind === 'ring' ? 'のこりの わ' : 'のこりの たま'}</text>
        <text x={64} y={29} className="gun-ammo-value">{shotsLeft} / {shots}</text>
        {Array.from({ length: shots }, (_, index) => (
          <g key={index} opacity={index < shotsLeft ? 1 : .2}>
            {kind === 'cork'
              ? <Artwork name="cork" x={125 + index * 16} y={14} width={11} height={14} />
              : kind === 'ball'
                ? <Artwork name="sling-ball" x={124 + index * 16} y={15} width={13} height={13} />
                : <ellipse cx={130.5 + index * 16} cy={21.5} rx={6} ry={4} className="gun-ammo-ring" />}
          </g>
        ))}
      </g>
  );
}
