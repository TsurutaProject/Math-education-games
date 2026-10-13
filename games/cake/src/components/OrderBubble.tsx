import type { CakeDefinition, Fraction, Order } from '../types/game'
import { formatFraction, gcd } from '../utils/fraction'
import { FuriganaText } from './FuriganaText'

interface OrderBubbleProps {
  order: Order
  cake: CakeDefinition
}

const getPiecePlan = (order: Order): Fraction[] => {
  if (order.recipePieces !== undefined) {
    return order.recipePieces
  }

  if (order.target.numerator <= 3) {
    return Array.from({ length: order.target.numerator }, () => ({
      numerator: 1,
      denominator: order.target.denominator,
    }))
  }

  return [order.target]
}

export function OrderBubble({ order, cake }: OrderBubbleProps) {
  const piecePlan = getPiecePlan(order)
  const isPieceCountChallenge = order.perfectPieceCount !== undefined
  const denominator = piecePlan.reduce((common, piece) =>
    common * piece.denominator / gcd(common, piece.denominator), 1)
  const numerators = piecePlan.map((piece) => piece.numerator * (denominator / piece.denominator))
  const hint = isPieceCountChallenge
    ? `合計を${formatFraction(order.target)}にそろえよう。大きいピースをさらに切ると、量を変えずにピースの数を増やせるよ。最高評価は${order.perfectPieceCount}ピースです。`
    : piecePlan.length > 1
      ? `ケーキを${denominator}等分した大きさで考えよう。${piecePlan.map((piece, index) => `${formatFraction(piece)}は${numerators[index]}個分`).join('、')}。合わせると${numerators.join('＋')}＝${numerators.reduce((sum, n) => sum + n, 0)}個分で、${formatFraction(order.target)}になるよ。`
      : `ホールケーキを同じ大きさに${order.target.denominator}等分して、そのうち${order.target.numerator}個分をトレーに移そう。`

  return (
    <section className="order-bubble" aria-label="注文">
      <div className="order-bubble__body">
        <div className="order-bubble__header">
          <p className={`order-bubble__cake order-bubble__cake--${order.cakeKind}`}>
            <span className="order-bubble__cake-thumb" aria-hidden="true">
              <img src={cake.imageUrl} alt="" />
            </span>
            <span>
              <small><FuriganaText text="注文ケーキ" /></small>
              <b><FuriganaText text={cake.name} /></b>
            </span>
          </p>
        </div>
        <p className="order-bubble__message">
          <span className="asset-label order-label">注文</span>
          <strong className="order-bubble__message-text">
            <FuriganaText text={order.message} />
          </strong>
        </p>
        <details key={order.id} className="order-bubble__plan"><summary>ヒント・最高評価の条件</summary>
          <p className="order-hint-explanation"><FuriganaText text={hint} /></p>
          <span className="order-bubble__label">
            <FuriganaText text={isPieceCountChallenge ? '最高評価' : '作るピース'} />
          </span>
          <div
            className="order-bubble__pieces"
            aria-label={
              isPieceCountChallenge
                ? `最高評価は${order.perfectPieceCount}ピース`
                : `作るピースは ${piecePlan.map(formatFraction).join(' と ')}`
            }
          >
            {isPieceCountChallenge ? (
              <span className="order-piece-chip">{order.perfectPieceCount}ピース</span>
            ) : (
              piecePlan.map((fraction, index) => (
                <span key={`${formatFraction(fraction)}-${index}`} className="order-piece-chip">
                  {formatFraction(fraction)}
                </span>
              ))
            )}
          </div>
        </details>
      </div>
      <div className="fraction-card" aria-label={`目標は ${formatFraction(order.target)}`}>
        <small><FuriganaText text="目標" /></small>
        <span>{order.target.numerator}</span>
        <span>{order.target.denominator}</span>
      </div>
    </section>
  )
}
