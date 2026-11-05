import { useEffect, useState } from 'react'

const designWidth = 2048
const designHeight = 1280

const getScale = () => Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight)

// A separate viewport keeps media queries, fixed dialogs and pointer coordinates
// in the same design space while the browser scales the complete game.
export function GameViewport() {
  const [scale, setScale] = useState(getScale)
  const [gameUrl] = useState(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('gameViewport', 'design')
    return url.href
  })

  useEffect(() => {
    const resize = () => setScale(getScale())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: designWidth * scale, height: designHeight * scale, position: 'relative' }}>
        <iframe
          title="分ケーキ"
          src={gameUrl}
          style={{
            display: 'block', width: designWidth, height: designHeight,
            border: 0, transform: `scale(${scale})`, transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  )
}
