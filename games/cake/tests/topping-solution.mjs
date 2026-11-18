// Exhaustively find a solution using only the game's 30-degree guide.
export function findSolution(order, toppings) {
  const required = order.target.numerator * 12 / order.target.denominator
  for (let bits = 1; bits < 4095; bits++) {
    const cells = Array.from({length:12}, (_, i) => (bits >> i) & 1)
    if (cells.reduce((a,b)=>a+b,0) !== required) continue
    const cuts = cells.flatMap((value,i)=>value !== cells[(i+11)%12] ? [i*30] : [])
    if (cuts.length > 6 || toppings.some(t=>cuts.some(a=>Math.min(Math.abs(t.angle-a),360-Math.abs(t.angle-a))<=7))) continue
    const served = toppings.filter(t=>cells[Math.floor(t.angle/30)])
    const request = order.toppingRequest
    if (request.total !== undefined ? served.length !== request.total : ['strawberry','banana','cream'].some(kind=>served.filter(t=>t.kind===kind).length !== (request.counts[kind]??0))) continue
    return {cells,cuts}
  }
  throw Error('Unsolvable: '+order.id)
}
