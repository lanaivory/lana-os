import type { AppState, PlaylistId } from './types'

export type BoardCardId = PlaylistId | string

export const PLAYLIST_CARD_IDS: PlaylistId[] = ['today', 'tomorrow', 'week']

export function isPlaylistId(id: string): id is PlaylistId {
  return id === 'today' || id === 'tomorrow' || id === 'week'
}

/**
 * Masonry default: playlists stacked in column 0,
 * category lists packed into stacked columns (~3 each).
 */
export function defaultBoardColumns(listIds: string[]): string[][] {
  const cols: string[][] = [['today', 'tomorrow', 'week']]
  const chunkSize = 3
  for (let i = 0; i < listIds.length; i += chunkSize) {
    cols.push(listIds.slice(i, i + chunkSize))
  }
  return cols
}

/** True when every non-playlist column is a single card (flat horizontal row). */
export function isFlatRowBoard(columns: string[][]): boolean {
  if (columns.length < 4) return false
  const rest = columns.filter((col) => !col.some(isPlaylistId))
  return rest.length >= 3 && rest.every((col) => col.length === 1)
}

/** Task ids currently referenced by any planning playlist. */
export function plannedTaskIds(state: AppState): Set<string> {
  return new Set([
    ...state.playlists.today,
    ...state.playlists.tomorrow,
    ...state.playlists.week,
  ])
}

export function findPlaylistContaining(
  state: AppState,
  taskId: string,
): PlaylistId | null {
  for (const id of PLAYLIST_CARD_IDS) {
    if (state.playlists[id].includes(taskId)) return id
  }
  return null
}

export function flattenBoard(columns: string[][]): string[] {
  return columns.flat()
}

export function removeCardFromBoard(
  columns: string[][],
  cardId: string,
): string[][] {
  return columns
    .map((col) => col.filter((id) => id !== cardId))
    .filter((col) => col.length > 0)
}

export function findCardLocation(
  columns: string[][],
  cardId: string,
): { column: number; index: number } | null {
  for (let c = 0; c < columns.length; c++) {
    const index = columns[c].indexOf(cardId)
    if (index !== -1) return { column: c, index }
  }
  return null
}

export function insertCardOnBoard(
  columns: string[][],
  cardId: string,
  target: { column: number; index: number } | { newColumnAt: number },
): string[][] {
  const from = findCardLocation(columns, cardId)
  const cleaned = removeCardFromBoard(columns, cardId).map((c) => [...c])

  if ('newColumnAt' in target) {
    let at = Math.max(0, Math.min(target.newColumnAt, cleaned.length + 1))
    if (from && columns[from.column].length === 1 && target.newColumnAt > from.column) {
      at = Math.max(0, at - 1)
    }
    cleaned.splice(at, 0, [cardId])
    return cleaned.filter((c) => c.length > 0)
  }

  let col = Math.max(0, Math.min(target.column, cleaned.length))
  if (from && columns[from.column].length === 1 && target.column > from.column) {
    col = Math.max(0, col - 1)
  }
  if (col === cleaned.length) {
    cleaned.push([cardId])
    return cleaned
  }

  let index = target.index
  if (from && from.column === target.column && from.index < target.index) {
    index -= 1
  }
  index = Math.max(0, Math.min(index, cleaned[col].length))
  cleaned[col].splice(index, 0, cardId)
  return cleaned
}

export function ensureBoardHasCards(
  columns: string[][],
  listIds: string[],
): string[][] {
  let next = columns.map((c) => [...c]).filter((c) => c.length > 0)

  // Upgrade legacy flat one-card-per-column layouts into masonry stacks.
  if (isFlatRowBoard(next)) {
    next = defaultBoardColumns(listIds)
  }

  const present = new Set(flattenBoard(next))

  for (const id of PLAYLIST_CARD_IDS) {
    if (!present.has(id)) {
      if (!next[0]) next.push([id])
      else if (!next[0].includes(id)) next[0].push(id)
      present.add(id)
    }
  }

  for (const id of listIds) {
    if (!present.has(id)) {
      // Pack into the last column if it has room, else new column.
      const last = next[next.length - 1]
      if (last && last.length < 3 && !last.some(isPlaylistId)) {
        last.push(id)
      } else {
        next.push([id])
      }
      present.add(id)
    }
  }

  const allowed = new Set<string>([...PLAYLIST_CARD_IDS, ...listIds])
  return next
    .map((col) => col.filter((id) => allowed.has(id)))
    .filter((col) => col.length > 0)
}

export function orderedListTasks(
  state: AppState,
  listId: string,
  opts?: { hidePlanned?: boolean },
): string[] {
  const planned = opts?.hidePlanned ? plannedTaskIds(state) : new Set<string>()
  const order = state.listOrders[listId] ?? []
  const inList = Object.values(state.tasks)
    .filter((t) => t.listId === listId)
    .filter((t) => !planned.has(t.id))
    .map((t) => t.id)

  const seen = new Set<string>()
  const ordered: string[] = []
  for (const id of order) {
    if (inList.includes(id) && !seen.has(id)) {
      ordered.push(id)
      seen.add(id)
    }
  }
  for (const id of inList) {
    if (!seen.has(id)) ordered.push(id)
  }
  return ordered
}

export function withListOrderAppend(
  listOrders: Record<string, string[]>,
  listId: string,
  taskId: string,
): Record<string, string[]> {
  const current = listOrders[listId] ?? []
  if (current.includes(taskId)) return listOrders
  return { ...listOrders, [listId]: [...current, taskId] }
}

export function withListOrderRemove(
  listOrders: Record<string, string[]>,
  taskId: string,
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [listId, ids] of Object.entries(listOrders)) {
    next[listId] = ids.filter((id) => id !== taskId)
  }
  return next
}

/** Resolve which board card a drag-over id belongs to. */
export function cardIdFromOverTarget(overId: string): string | null {
  if (overId.startsWith('card:')) return overId.slice(5)
  if (overId.startsWith('tasks:playlist:')) {
    return overId.slice('tasks:playlist:'.length)
  }
  if (overId.startsWith('tasks:list:')) {
    return overId.slice('tasks:list:'.length)
  }
  // task:playlist:today:taskId or task:list:inbox:taskId
  const m = overId.match(/^task:(?:playlist|list):([^:]+):/)
  if (m) return m[1]
  return null
}
