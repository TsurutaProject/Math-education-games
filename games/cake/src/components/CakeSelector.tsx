import type { CakeDefinition, CakeKind } from '../types/game'
import { FuriganaText } from './FuriganaText'

interface CakeSelectorProps {
  cakes: CakeDefinition[]
  activeCakeId: CakeKind
  unlockedCakeIds: CakeKind[]
  money: number
  onSelectCake: (cakeId: CakeKind) => void
  onBuyCake: (cakeId: CakeKind) => void
}

export function CakeSelector({
  cakes,
  activeCakeId,
  unlockedCakeIds,
  money,
  onSelectCake,
  onBuyCake,
}: CakeSelectorProps) {
  return (
    <section className="cake-selector" aria-label="販売するケーキ">
      <div className="cake-selector__header">
        <h2>ケーキ</h2>
      </div>
      <div className="cake-selector__list">
        {cakes.map((cake) => {
          const isUnlocked = unlockedCakeIds.includes(cake.id)
          const canBuy = money >= cake.price

          return (
            <article
              key={cake.id}
              className={cake.id === activeCakeId ? 'cake-option is-active' : 'cake-option'}
            >
              <img className="cake-option__image" src={cake.imageUrl} alt="" />
              <div>
                <h3><FuriganaText text={cake.name} /></h3>
                <p><FuriganaText text={cake.description} /></p>
              </div>
              {isUnlocked ? (
                <button type="button" onClick={() => onSelectCake(cake.id)}>
                  <FuriganaText text={cake.id === activeCakeId ? '選択中' : '選ぶ'} />
                </button>
              ) : (
                <button type="button" disabled={!canBuy} onClick={() => onBuyCake(cake.id)}>
                  {cake.price.toLocaleString()}<FuriganaText text="円で解放" />
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
