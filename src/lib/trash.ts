import {
  findCardLocation,
  insertCardOnBoard,
  PLAYLIST_CARD_IDS,
  removeCardFromBoard,
  withListOrderRemove,
} from './board'
import type {
  AppState,
  ContextList,
  PlaylistId,
  Task,
  TrashEntry,
  TrashListEntry,
  TrashTaskEntry,
} from './types'

export const TRASH_TTL_MS = 24 * 60 * 60 * 1000

function playlistMemberships(state: AppState, taskId: string): PlaylistId[] {
  return PLAYLIST_CARD_IDS.filter((pid) => state.playlists[pid].includes(taskId))
}

function stripTaskEverywhere(state: AppState, taskId: string): AppState {
  if (!state.tasks[taskId]) return state
  const tasks = { ...state.tasks }
  delete tasks[taskId]
  return {
    ...state,
    tasks,
    playlists: {
      today: state.playlists.today.filter((id) => id !== taskId),
      tomorrow: state.playlists.tomorrow.filter((id) => id !== taskId),
      week: state.playlists.week.filter((id) => id !== taskId),
    },
    listOrders: withListOrderRemove(state.listOrders, taskId),
  }
}

function insertAtIndex(ids: string[], taskId: string, index: number): string[] {
  const next = ids.filter((id) => id !== taskId)
  const at = Math.max(0, Math.min(index, next.length))
  next.splice(at, 0, taskId)
  return next
}

function resolveListId(state: AppState, preferred: string): string {
  if (state.lists.some((l) => l.id === preferred)) return preferred
  if (state.lists.some((l) => l.id === 'random')) return 'random'
  return state.lists[0]?.id ?? preferred
}

function restoreTaskIntoState(
  state: AppState,
  task: Task,
  playlists: PlaylistId[],
  listOrderIndex: number,
): AppState {
  if (state.tasks[task.id]) return state

  const listId = resolveListId(state, task.listId)
  const restored: Task = { ...task, listId }
  const listOrders = {
    ...state.listOrders,
    [listId]: insertAtIndex(
      state.listOrders[listId] ?? [],
      task.id,
      listOrderIndex,
    ),
  }

  const nextPlaylists = {
    today: [...state.playlists.today],
    tomorrow: [...state.playlists.tomorrow],
    week: [...state.playlists.week],
  }
  for (const pid of playlists) {
    if (!nextPlaylists[pid].includes(task.id)) {
      nextPlaylists[pid] = [...nextPlaylists[pid], task.id]
    }
  }

  return {
    ...state,
    tasks: { ...state.tasks, [task.id]: restored },
    listOrders,
    playlists: nextPlaylists,
  }
}

/** Ids of lists currently sitting in the recovery bin. */
export function trashedListIds(trash: TrashEntry[]): Set<string> {
  return new Set(
    trash.filter((e): e is TrashListEntry => e.kind === 'list').map((e) => e.list.id),
  )
}

/**
 * Soft-delete a single task into Recently Deleted.
 * Preserves playlist memberships for restore.
 */
export function softDeleteTask(
  state: AppState,
  taskId: string,
  now = Date.now(),
): AppState {
  const task = state.tasks[taskId]
  if (!task) return state

  const order = state.listOrders[task.listId] ?? []
  const listOrderIndex = order.indexOf(taskId)
  const entry: TrashTaskEntry = {
    kind: 'task',
    deletedAt: now,
    task: { ...task },
    playlists: playlistMemberships(state, taskId),
    listOrderIndex: listOrderIndex >= 0 ? listOrderIndex : order.length,
  }

  const stripped = stripTaskEverywhere(state, taskId)
  return {
    ...stripped,
    trash: [entry, ...stripped.trash],
  }
}

/**
 * Soft-delete a context list and all of its tasks together.
 */
export function softDeleteList(
  state: AppState,
  listId: string,
  now = Date.now(),
): AppState {
  const list = state.lists.find((l) => l.id === listId)
  if (!list) return state

  const listOrder = [...(state.listOrders[listId] ?? [])]
  const belonging = Object.values(state.tasks).filter((t) => t.listId === listId)
  const byId = new Map(belonging.map((t) => [t.id, t]))

  const orderedTasks: Task[] = []
  for (const id of listOrder) {
    const t = byId.get(id)
    if (t) {
      orderedTasks.push(t)
      byId.delete(id)
    }
  }
  for (const t of byId.values()) orderedTasks.push(t)

  const loc = findCardLocation(state.boardColumns, listId)
  const entry: TrashListEntry = {
    kind: 'list',
    deletedAt: now,
    list: { ...list },
    tasks: orderedTasks.map((task) => ({
      task: { ...task },
      playlists: playlistMemberships(state, task.id),
    })),
    listOrder,
    boardColumn: loc?.column ?? state.boardColumns.length,
    boardIndex: loc?.index ?? 0,
  }

  let next: AppState = state
  for (const task of orderedTasks) {
    next = stripTaskEverywhere(next, task.id)
  }

  const listOrders = { ...next.listOrders }
  delete listOrders[listId]

  return {
    ...next,
    lists: next.lists.filter((l) => l.id !== listId),
    boardColumns: removeCardFromBoard(next.boardColumns, listId),
    listOrders,
    trash: [entry, ...next.trash],
  }
}

export function restoreTrashEntry(state: AppState, entry: TrashEntry): AppState {
  const base = {
    ...state,
    trash: state.trash.filter((e) => !sameTrashEntry(e, entry)),
  }

  if (entry.kind === 'task') {
    return restoreTaskIntoState(
      base,
      entry.task,
      entry.playlists,
      entry.listOrderIndex,
    )
  }

  return restoreListEntry(base, entry)
}

function restoreListEntry(state: AppState, entry: TrashListEntry): AppState {
  if (state.lists.some((l) => l.id === entry.list.id)) {
    // List already present (e.g. builtin re-seeded) — still restore missing tasks.
    let next = state
    for (const item of entry.tasks) {
      const index = entry.listOrder.indexOf(item.task.id)
      next = restoreTaskIntoState(
        next,
        item.task,
        item.playlists,
        index >= 0 ? index : entry.listOrder.length,
      )
    }
    return next
  }

  const list: ContextList = { ...entry.list }
  const lists = [...state.lists, list]
  let boardColumns = removeCardFromBoard(state.boardColumns, list.id)
  boardColumns = insertCardOnBoard(boardColumns, list.id, {
    column: entry.boardColumn,
    index: entry.boardIndex,
  })

  let next: AppState = {
    ...state,
    lists,
    boardColumns,
    listOrders: { ...state.listOrders, [list.id]: [] },
  }

  for (const item of entry.tasks) {
    const index = entry.listOrder.indexOf(item.task.id)
    next = restoreTaskIntoState(
      next,
      { ...item.task, listId: list.id },
      item.playlists,
      index >= 0 ? index : entry.listOrder.length,
    )
  }

  // Prefer the saved order when all ids are present.
  const restoredOrder = entry.listOrder.filter((id) => next.tasks[id]?.listId === list.id)
  const extras = (next.listOrders[list.id] ?? []).filter((id) => !restoredOrder.includes(id))
  return {
    ...next,
    listOrders: {
      ...next.listOrders,
      [list.id]: [...restoredOrder, ...extras],
    },
  }
}

export function permanentlyDeleteTrashEntry(
  state: AppState,
  entry: TrashEntry,
): AppState {
  return {
    ...state,
    trash: state.trash.filter((e) => !sameTrashEntry(e, entry)),
  }
}

export function sameTrashEntry(a: TrashEntry, b: TrashEntry): boolean {
  if (a.kind !== b.kind || a.deletedAt !== b.deletedAt) return false
  if (a.kind === 'task' && b.kind === 'task') return a.task.id === b.task.id
  if (a.kind === 'list' && b.kind === 'list') return a.list.id === b.list.id
  return false
}

/** Drop trash entries older than 24 hours. */
export function purgeExpiredTrash(state: AppState, now = Date.now()): AppState {
  const trash = state.trash.filter((e) => now - e.deletedAt < TRASH_TTL_MS)
  if (trash.length === state.trash.length) return state
  return { ...state, trash }
}

/** Ms remaining until a trash entry is auto-purged (0 if due). */
export function msUntilTrashPurge(entry: TrashEntry, now = Date.now()): number {
  return Math.max(0, TRASH_TTL_MS - (now - entry.deletedAt))
}

export function formatTrashTimeRemaining(
  entry: TrashEntry,
  now = Date.now(),
): string {
  const ms = msUntilTrashPurge(entry, now)
  if (ms <= 0) return 'Expiring soon'
  const totalMinutes = Math.ceil(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m left`
  if (minutes === 0) return `${hours}h left`
  return `${hours}h ${minutes}m left`
}

export function trashEntryKey(entry: TrashEntry): string {
  if (entry.kind === 'task') return `task:${entry.task.id}:${entry.deletedAt}`
  return `list:${entry.list.id}:${entry.deletedAt}`
}
