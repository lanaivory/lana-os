import { flattenBoard, isPlaylistId } from './board'
import type { AppState, PlaylistId } from './types'

/** Board-order match for Find: first task whose text includes the query. */
export function findFirstSearchMatch(
  state: AppState,
  query: string,
): { taskId: string; cardId: string } | null {
  const q = query.trim().toLowerCase()
  if (!q) return null

  const cardOrder = flattenBoard(state.boardColumns)
  for (const cardId of cardOrder) {
    const taskIds = taskIdsForCard(state, cardId)
    for (const taskId of taskIds) {
      const task = state.tasks[taskId]
      if (!task) continue
      if (task.text.toLowerCase().includes(q)) {
        return { taskId, cardId }
      }
    }
  }
  return null
}

function taskIdsForCard(state: AppState, cardId: string): string[] {
  if (isPlaylistId(cardId)) {
    return state.playlists[cardId].filter((id) => state.tasks[id])
  }
  return Object.values(state.tasks)
    .filter((t) => t.listId === cardId)
    .map((t) => t.id)
}

export function cardNeedsExpand(
  state: AppState,
  cardId: string,
): { kind: 'list' | 'playlist'; id: string } | null {
  if (isPlaylistId(cardId)) {
    if (state.collapsedPlaylists[cardId]) {
      return { kind: 'playlist', id: cardId }
    }
    return null
  }
  const list = state.lists.find((l) => l.id === cardId)
  if (list?.collapsed) return { kind: 'list', id: cardId }
  return null
}

export type { PlaylistId }
