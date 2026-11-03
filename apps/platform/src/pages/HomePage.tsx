import { useEffect } from 'react'
import { GameCard } from '../components/GameCard'
import { games, type GameEntry } from '../data/games'
import { logStore, PLATFORM_GAME } from '../log/logStore'

export function HomePage() {
  useEffect(() => {
    logStore.log(PLATFORM_GAME, 'home_view')
  }, [])

  const handleOpen = (game: GameEntry): void => {
    logStore.log(PLATFORM_GAME, 'game_open', { gameId: game.id })
  }

  return (
    <main className="home">
      <div className="home__bg" aria-hidden="true" />
      <h1 className="home__title">あそぶゲームを えらんでね！</h1>
      <ul className="home__games">
        {games.map((game) => (
          <li key={game.id}>
            <GameCard game={game} onOpen={handleOpen} />
          </li>
        ))}
      </ul>
    </main>
  )
}
