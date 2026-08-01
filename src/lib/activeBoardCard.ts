const ACTIVE_CARD_KEY = 'lana-os:active-board-card'

/** Last-viewed board card on the mobile-native single-list layout. */
export function loadActiveBoardCardId(): string | null {
  try {
    const value = localStorage.getItem(ACTIVE_CARD_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

export function saveActiveBoardCardId(cardId: string): void {
  try {
    localStorage.setItem(ACTIVE_CARD_KEY, cardId)
  } catch {
    // Quota / private mode — ignore.
  }
}

/** Prefer a saved id when it still exists on the board; else first card. */
export function resolveActiveBoardCardId(
  cardIds: string[],
  preferred: string | null | undefined,
): string | null {
  if (cardIds.length === 0) return null
  if (preferred && cardIds.includes(preferred)) return preferred
  return cardIds[0] ?? null
}
