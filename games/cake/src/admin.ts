// Admin sessions never read or write normal player progress.
export const isAdminPath = (pathname: string): boolean => /\/admin\/?$/.test(pathname)
export const isAdminMode = typeof window !== 'undefined' && isAdminPath(window.location.pathname)
const memory = new Map<string, string>()
export const gameStorage = {
  getItem(key: string): string | null { return isAdminMode ? memory.get(key) ?? null : window.localStorage.getItem(key) },
  setItem(key: string, value: string): void { if (isAdminMode) memory.set(key, value); else window.localStorage.setItem(key, value) },
}
