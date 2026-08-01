import { isPlaylistId } from './board'
import type { AppState } from './types'

/** Display label for a board card (playlist or context list). */
export function cardLabel(state: AppState, cardId: string): string {
  if (isPlaylistId(cardId)) {
    if (cardId === 'today') return 'Today'
    if (cardId === 'tomorrow') return 'Tomorrow'
    return 'This Week'
  }
  return state.lists.find((l) => l.id === cardId)?.name ?? 'List'
}
