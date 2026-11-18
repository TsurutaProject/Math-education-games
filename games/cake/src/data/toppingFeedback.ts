import type { CakeKind, CakePieceModel, Order, Topping, ToppingKind } from '../types/game'
import { addFractions, formatFraction } from '../utils/fraction'
import { evaluateOrder } from '../utils/orderEvaluation'

const names: Record<ToppingKind, string> = { strawberry: 'いちご', banana: 'バナナ', cream: 'クリーム' }

export function getToppingFeedback(order: Order, pieces: CakePieceModel[], cakeKind: CakeKind, cakeToppings: Topping[]) {
  const { quantityCorrect } = evaluateOrder(order, pieces, cakeKind)
  const total = formatFraction(addFractions(pieces.map(piece => piece.fraction)))
  const messages: string[] = []
  if (!quantityCorrect) messages.push(`ケーキの量は今${total}、注文は${formatFraction(order.target)}だよ。`)
  const toppings = pieces.flatMap(piece => piece.toppings ?? [])
  const request = order.toppingRequest
  const describeDifference = (name: string, actual: number, expected: number) => {
    if (actual < expected) messages.push(`${name}が${expected - actual}つ足りないよ。`)
    if (actual > expected) messages.push(`${name}が${actual - expected}つ多いよ。`)
  }
  if (request?.total !== undefined) {
    describeDifference('トッピング', toppings.length, request.total)
  } else if (request?.counts) {
    for (const kind of ['strawberry', 'banana', 'cream'] as const) {
      describeDifference(names[kind], toppings.filter(t => t.kind === kind).length, request.counts[kind] ?? 0)
    }
  }
  // Cut history can include toppings on pieces left on the board.
  const damagedIds = new Set(pieces.flatMap(piece => piece.cutToppingIds ?? []))
  const damagedKinds = [...new Set(cakeToppings.filter(t => damagedIds.has(t.id)).map(t => t.kind))]
  if (damagedIds.size > 0) {
    const damagedNames = damagedKinds.length ? damagedKinds.map(kind => names[kind]).join('と') : 'トッピング'
    messages.push(`${damagedNames}を切ってしまっているよ。`)
  }
  return {
    title: quantityCorrect ? `量はぴったり！ (${total})` : '量とトッピングを確認してね',
    detail: messages.join(' '),
  }
}
