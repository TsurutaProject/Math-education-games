// Shared by the drag preview and release handler so the highlight means "can drop".
export function canDropOnTray(x: number, y: number): boolean {
  const target = document.elementFromPoint(x, y)
  if (target === null) return false
  const tray = document.querySelector('.tray')
  const bounds = tray?.getBoundingClientRect()
  const margin = 64 // Design pixels, scaled together with the game viewport.
  const nearTray = bounds !== undefined &&
    x >= bounds.left - margin && x <= bounds.right + margin &&
    y >= bounds.top - margin && y <= bounds.bottom + margin
  return target.closest('.tray') !== null || (nearTray && target.closest('button') === null)
}
