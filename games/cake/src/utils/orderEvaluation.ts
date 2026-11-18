import type { CakeKind, CakePieceModel, Order } from '../types/game'
import { addFractions, areFractionsEqual } from './fraction'
export function evaluateOrder(order: Order, pieces: CakePieceModel[], fallbackKind: CakeKind) {
  const items = order.items ?? [{ cakeKind: order.cakeKind, target: order.target }]
  const cakeCorrect = pieces.every(p => items.some(item => item.cakeKind === (p.cakeKind ?? fallbackKind)))
  const quantityCorrect = pieces.length > 0 && items.every(item => areFractionsEqual(item.target,
    addFractions(pieces.filter(p => (p.cakeKind ?? fallbackKind) === item.cakeKind).map(p => p.fraction))))
  const toppings = pieces.flatMap(p => p.toppings ?? [])
  const request = order.toppingRequest
  const toppingsIntact = pieces.every(p => (p.cutToppingIds ?? []).length === 0)
  const toppingCorrect = !request || (toppingsIntact && (request.total !== undefined
    ? toppings.length === request.total
    : (['strawberry', 'banana', 'cream'] as const).every(kind => toppings.filter(t => t.kind === kind).length === (request.counts?.[kind] ?? 0))))
  return { cakeCorrect, quantityCorrect, toppingCorrect, correct: cakeCorrect && quantityCorrect && toppingCorrect }
}
