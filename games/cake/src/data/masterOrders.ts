import type { Order } from '../types/game'
import { drawToppingOrder } from './toppingChallenge'

export function getOrderCategory(order: Order): string {
  if (order.items) return 'two-cakes'
  if (order.toppingRequest) return 'toppings'
  if (order.id.includes('random-piece-count')) return 'random-piece-count'
  if (order.perfectPieceCount !== undefined) return 'piece-count'
  if (order.recipePieces) return 'recipe'
  return 'basic'
}

// Cover every skill before repeating a category, regardless of combo/difficulty.
export function drawMasterOrder(orders: Order[], seenCategories: string[], previousId?: string, random = Math.random): string {
  const categories = [...new Set(orders.map(getOrderCategory))]
  const category = drawToppingOrder(categories, seenCategories, random)
  const pool = orders.filter(order => getOrderCategory(order) === category && order.id !== previousId)
  return pool[Math.floor(random() * pool.length)].id
}
