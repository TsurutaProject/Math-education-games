import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { GameViewport } from './components/GameViewport'

const isDesignViewport = window.parent !== window &&
  new URLSearchParams(window.location.search).get('gameViewport') === 'design'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDesignViewport ? <App /> : <GameViewport />}
  </StrictMode>,
)
