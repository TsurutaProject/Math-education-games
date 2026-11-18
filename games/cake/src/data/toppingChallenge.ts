import type { Order, Topping, ToppingKind } from '../types/game'

const labels: Record<ToppingKind, string> = { strawberry: 'いちご', banana: 'バナナ', cream: 'クリーム' }
const kinds: ToppingKind[] = ['strawberry', 'banana', 'cream']
const shuffle = <T,>(values: T[], random: () => number): T[] => {
  const result = [...values]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// A seeded generator keeps the layout stable across hints, resets and tutorials.
export function createToppingLayout(order: Order, seed: number): Topping[] {
  let state = (seed >>> 0) || 1
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const units = order.target.numerator * 12 / order.target.denominator
  const request = order.toppingRequest!
  const requested = request.total !== undefined
    ? Array.from({ length: request.total }, () => kinds[Math.floor(random() * kinds.length)])
    : kinds.flatMap(kind => Array<ToppingKind>(request.counts?.[kind] ?? 0).fill(kind))
  const extra = Array.from({ length: Math.min(3, 12 - units) }, () => kinds[Math.floor(random() * kinds.length)])
  const masks: number[][] = []
  for (let bits = 1; bits < 4095; bits++) {
    const cells = Array.from({ length: 12 }, (_, i) => (bits >> i) & 1)
    const runs = cells.filter((value, i) => value && !cells[(i + 11) % 12]).length
    if (cells.reduce((a, b) => a + b, 0) === units && runs === (order.difficulty >= 4 ? 2 : 1)) masks.push(cells)
  }
  for (const cells of shuffle(masks, random)) {
    // Mid-sector sites and internal guide lines are safe for this solution.
    // Some toppings sit on other guide lines, so careless cuts still damage them.
    const sites = Array.from({ length: 24 }, (_, i) => i * 15).filter(angle => {
      const cell = Math.floor(angle / 30)
      return angle % 30 !== 0 || cells[cell] === cells[(cell + 11) % 12]
    })
    const result: Topping[] = []
    const add = (items: ToppingKind[], selected: number): boolean => {
      for (const kind of items) {
        const candidates = shuffle(sites.filter(angle => cells[Math.floor(angle / 30)] === selected), random)
        const angle = candidates.find(a => result.every(t => Math.min(Math.abs(t.angle - a), 360 - Math.abs(t.angle - a)) >= 30))
        if (angle === undefined) return false
        result.push({ id: `challenge-${result.length}`, kind, label: labels[kind], angle, radius: 72 + Math.floor(random() * 9) })
      }
      return true
    }
    if (add(requested, 1) && add(extra, 0)) return result
  }
  throw new Error('No valid topping layout for order: ' + order.id)
}

// Draw each order once before reshuffling, avoiding the deterministic two-order loop.
export function drawToppingOrder(ids: string[], seen: string[], random = Math.random): string {
  let available = ids.filter(id => !seen.includes(id))
  if (available.length === 0) {
    const previous = seen.at(-1)
    seen.length = 0
    available = ids.filter(id => id !== previous)
  }
  const chosen = available[Math.floor(random() * available.length)] ?? ids[0]
  seen.push(chosen)
  return chosen
}
