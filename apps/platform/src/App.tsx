import { useSyncExternalStore } from 'react'
import { AdminLogPage } from './pages/AdminLogPage'
import { HomePage } from './pages/HomePage'

const subscribeHash = (onChange: () => void): (() => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

const getHash = (): string => window.location.hash

function App() {
  const hash = useSyncExternalStore(subscribeHash, getHash)

  return hash === '#/admin' ? <AdminLogPage /> : <HomePage />
}

export default App
