import type { Order } from '../types/game'
import { customerImages } from '../data/assets'

interface CustomerQueueProps {
  orders: Order[]
  activeOrderId: string
}

export function CustomerQueue({ orders, activeOrderId }: CustomerQueueProps) {
  return (
    <aside className="customer-queue" aria-label="今のお客さん">
      <ol className="customer-queue__list">
        {orders.map((order, index) => (
          <li
            key={`${order.id}-${index}`}
            className={
              order.id === activeOrderId ? 'customer-queue__item is-active' : 'customer-queue__item'
            }
          >
            <span className="customer-queue__avatar" aria-hidden="true">
              <img src={customerImages[order.customerName]} alt="" />
            </span>
            <strong className="customer-queue__details">{order.customerName}さん</strong>
          </li>
        ))}
      </ol>
    </aside>
  )
}
