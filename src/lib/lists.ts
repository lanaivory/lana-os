import { defaultBoardColumns, ensureBoardHasCards } from './board'
import type { AppState, ContextList, Task } from './types'
import { DEFAULT_LISTS, LISTS_VERSION } from './types'

/** Old list ids that map cleanly onto the v2 canonical set. */
const LIST_ID_ALIASES: Record<string, string> = {
  inbox: 'random',
  content: 'content-todo',
  'follow-up': 'follow-ups',
}

const FALLBACK_LIST_ID = 'random'

/** Ensure built-in lists exist (in seed order) without dropping custom ones. */
export function ensureBuiltinLists(lists: ContextList[]): ContextList[] {
  const byId = new Map(lists.map((l) => [l.id, l]))
  const next: ContextList[] = []

  for (const def of DEFAULT_LISTS) {
    const existing = byId.get(def.id)
    if (existing) {
      next.push(existing)
      byId.delete(def.id)
    } else {
      next.push({ ...def })
    }
  }

  for (const list of lists) {
    if (!DEFAULT_LISTS.some((d) => d.id === list.id)) {
      next.push(list)
    }
  }

  return next
}

/**
 * One-time migration to the canonical DEFAULT_LISTS set.
 * - Remaps known renamed ids (inbox→random, content→content-todo, follow-up→follow-ups)
 * - Sets lists to exactly the seed lists (preserving collapsed for matching ids)
 * - Moves tasks whose list no longer exists into Random
 * - Rebuilds board columns left-to-right in seed order
 */
export function migrateCanonicalLists(state: AppState): AppState {
  if ((state.listsVersion ?? 0) >= LISTS_VERSION) {
    return {
      ...state,
      lists: ensureBuiltinLists(state.lists),
      listsVersion: LISTS_VERSION,
    }
  }

  const prevById = new Map(state.lists.map((l) => [l.id, l]))
  const lists = DEFAULT_LISTS.map((def) => {
    const existing = prevById.get(def.id)
    return existing
      ? { ...def, collapsed: existing.collapsed, color: existing.color || def.color }
      : { ...def }
  })
  const validIds = new Set(lists.map((l) => l.id))

  const tasks: Record<string, Task> = {}
  for (const [id, task] of Object.entries(state.tasks)) {
    const aliased = LIST_ID_ALIASES[task.listId] ?? task.listId
    const listId = validIds.has(aliased) ? aliased : FALLBACK_LIST_ID
    tasks[id] = { ...task, listId }
  }

  const listOrders: Record<string, string[]> = {}
  for (const listId of validIds) {
    listOrders[listId] = []
  }

  const appendUnique = (listId: string, taskIds: string[]) => {
    const bucket = listOrders[listId] ?? (listOrders[listId] = [])
    for (const taskId of taskIds) {
      if (!bucket.includes(taskId) && tasks[taskId]?.listId === listId) {
        bucket.push(taskId)
      }
    }
  }

  for (const [oldListId, order] of Object.entries(state.listOrders ?? {})) {
    const aliased = LIST_ID_ALIASES[oldListId] ?? oldListId
    const target = validIds.has(aliased) ? aliased : FALLBACK_LIST_ID
    appendUnique(target, order)
  }

  // Ensure every task appears in its list order (orphans / remapped).
  for (const task of Object.values(tasks)) {
    appendUnique(task.listId, [task.id])
  }

  const listIds = lists.map((l) => l.id)
  const boardColumns = defaultBoardColumns(listIds)

  return {
    ...state,
    tasks,
    lists,
    listOrders,
    boardColumns: ensureBoardHasCards(boardColumns, listIds),
    listsVersion: LISTS_VERSION,
  }
}
