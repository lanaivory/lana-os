import { rankLists } from './classifier'
import type { AppState, ContextList } from './types'

/**
 * The handful of lists the capture sheet offers as chips, so the wall of every
 * list can stay behind a "More…" picker.
 *
 * Order: the list the task already lives in (an edit keeps its answer visible
 * and preselected), then whatever the classifier recognises in the text, then
 * recently used lists, then the remaining lists in board order.
 */
export function suggestLists(
  text: string,
  opts: {
    lists: ContextList[]
    currentListId?: string | null
    /** Most recently filed first — used to pad a thin suggestion set. */
    recentListIds?: string[]
    limit?: number
  },
): string[] {
  const { lists, currentListId = null, recentListIds = [], limit = 3 } = opts
  const known = new Set(lists.map((list) => list.id))
  const picked: string[] = []

  const add = (listId: string | null | undefined) => {
    if (!listId || picked.length >= limit) return
    if (!known.has(listId) || picked.includes(listId)) return
    picked.push(listId)
  }

  add(currentListId)
  for (const hit of rankLists(text)) add(hit.listId)
  for (const listId of recentListIds) add(listId)
  for (const list of lists) add(list.id)

  return picked
}

/** Lists most recently filed into, newest first — a cheap "you usually pick these". */
export function recentlyUsedListIds(state: AppState, limit = 5): string[] {
  const seen: string[] = []
  const tasks = Object.values(state.tasks).sort(
    (a, b) => b.createdAt - a.createdAt,
  )
  for (const task of tasks) {
    if (seen.length >= limit) break
    if (!seen.includes(task.listId)) seen.push(task.listId)
  }
  return seen
}
