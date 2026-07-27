const ZOOM_KEY = 'lana-os:board-zoom-out'

/** Board zoom-out preference (mobile). Independent of cloud-synced app state. */
export function loadBoardZoomOut(): boolean {
  try {
    return localStorage.getItem(ZOOM_KEY) === '1'
  } catch {
    return false
  }
}

export function saveBoardZoomOut(zoomOut: boolean): void {
  try {
    localStorage.setItem(ZOOM_KEY, zoomOut ? '1' : '0')
  } catch {
    // Quota / private mode — ignore.
  }
}
