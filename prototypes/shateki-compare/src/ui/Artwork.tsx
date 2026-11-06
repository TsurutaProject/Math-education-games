import { artworkUrl, SPRITES, type SpriteName } from './artworkAssets';

export function Artwork({ name, x, y, width, height }: { name: SpriteName; x: number; y: number; width: number; height: number }) {
  return <svg x={x} y={y} width={width} height={height} viewBox={SPRITES[name].join(' ')} preserveAspectRatio="none" overflow="hidden" pointerEvents="none" aria-hidden="true">
    <image href={artworkUrl(name)} width={3508} height={2481} />
  </svg>;
}
