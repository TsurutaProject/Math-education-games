/** 奥の提灯は背景の飾り。操作や当たり判定を遮らない。 */
export function FestivalDecor() {
  return <g className="festival-decor" pointerEvents="none" aria-hidden="true">
    <path d="M100 8 Q500 30 900 8" fill="none" stroke="#bba58d" strokeWidth="1.5" />
    {[200, 350, 500, 650, 800].map((x, i) => <g key={x}>
      <line x1={x} y1={12 + (2 - Math.abs(2 - i)) * 3} x2={x} y2={25} stroke="#bba58d" strokeWidth="1.5" />
      <ellipse cx={x} cy={32} rx={9} ry={11} fill={i % 2 ? '#f3bb4c' : '#d65b45'} />
      <path d={`M${x - 5} 22H${x + 5}M${x - 5} 42H${x + 5}`} stroke="#744a2b" strokeWidth="2" />
    </g>)}
  </g>;
}
