import {
  findPlaylistContaining,
  flattenListCardIds,
  orderedListTasks,
  plannedTaskIds,
} from './board'
import { sortTasksForListMode, type ListSortMode } from './listSort'
import type { AppState, ContextList, PlaylistId, Task } from './types'

export type MobileListSection = {
  list: ContextList
  /** Tasks to render: filtered by query, ordered by the active sort mode. */
  tasks: Task[]
  /** Tasks the list owns and that are not planned into a day, ignoring the query. */
  total: number
}

/** One row of the Lists tab index. */
export type MobileListOverview = {
  list: ContextList
  /** Unplanned tasks the list owns, complete or not. */
  total: number
  /** Unplanned tasks still to do. */
  open: number
  /** Owned tasks planned into a day, so shown on the Playlist tab instead. */
  planned: number
}

/** One result of a cross-list search. */
export type MobileSearchHit = {
  task: Task
  list: ContextList | null
  /** The day it is planned into, when it is planned at all. */
  day: PlaylistId | null
}

export type TaskLocation =
  | { kind: 'agenda'; day: PlaylistId }
  | { kind: 'list'; listId: string }

function taskById(state: AppState, id: string): Task | null {
  return state.tasks[id] ?? null
}

/** Tasks planned into one day, in the order the playlist stores them. */
export function agendaTasks(state: AppState, day: PlaylistId): Task[] {
  const tasks = state.playlists[day]
    .map((id) => taskById(state, id))
    .filter((task): task is Task => task !== null)

  if (day !== 'today' || !state.sortTodayByTime) return tasks

  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (!a.time && !b.time) return 0
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
  })
}

/** Context list ids in board order, shared with the desktop board layout. */
export function mobileListOrder(state: AppState): string[] {
  const known = new Set(state.lists.map((l) => l.id))
  return flattenListCardIds(state.boardColumns).filter((id) => known.has(id))
}

export function listSection(
  state: AppState,
  listId: string,
  opts: { query?: string; sort?: ListSortMode } = {},
): MobileListSection | null {
  const list = state.lists.find((l) => l.id === listId)
  if (!list) return null

  const owned = orderedListTasks(state, listId, { hidePlanned: true })
    .map((id) => taskById(state, id))
    .filter((task): task is Task => task !== null)

  const sorted = sortTasksForListMode(owned, opts.sort ?? 'custom')
  const query = opts.query?.trim().toLowerCase() ?? ''
  const tasks = query
    ? sorted.filter((task) => task.text.toLowerCase().includes(query))
    : sorted

  return { list, tasks, total: owned.length }
}

export function listSections(
  state: AppState,
  opts: { query?: string; sort?: ListSortMode } = {},
): MobileListSection[] {
  return mobileListOrder(state)
    .map((listId) => listSection(state, listId, opts))
    .filter((section): section is MobileListSection => section !== null)
}

/** Counts for the Lists tab index, in board order. */
export function listOverviews(state: AppState): MobileListOverview[] {
  const planned = plannedTaskIds(state)

  return mobileListOrder(state).flatMap((listId) => {
    const list = state.lists.find((l) => l.id === listId)
    if (!list) return []

    const owned = Object.values(state.tasks).filter((t) => t.listId === listId)
    const unplanned = owned.filter((t) => !planned.has(t.id))

    return [
      {
        list,
        total: unplanned.length,
        open: unplanned.filter((t) => !t.completed).length,
        planned: owned.length - unplanned.length,
      },
    ]
  })
}

/**
 * Search every task, planned or not, in the order the Lists tab shows them.
 * Open tasks come first so a match you can still act on is never buried.
 */
export function searchTasks(state: AppState, query: string): MobileSearchHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const listById = new Map(state.lists.map((l) => [l.id, l]))
  const seen = new Set<string>()
  const hits: MobileSearchHit[] = []

  const consider = (task: Task) => {
    if (seen.has(task.id)) return
    seen.add(task.id)
    if (!task.text.toLowerCase().includes(needle)) return
    hits.push({
      task,
      list: listById.get(task.listId) ?? null,
      day: findPlaylistContaining(state, task.id),
    })
  }

  for (const listId of mobileListOrder(state)) {
    for (const taskId of orderedListTasks(state, listId)) {
      const task = taskById(state, taskId)
      if (task) consider(task)
    }
  }
  // Tasks whose list was deleted still deserve to be findable.
  for (const task of Object.values(state.tasks)) consider(task)

  return [
    ...hits.filter((hit) => !hit.task.completed),
    ...hits.filter((hit) => hit.task.completed),
  ]
}

/** Where a task is shown on mobile — a planned day wins over its context list. */
export function taskLocation(
  state: AppState,
  taskId: string,
): TaskLocation | null {
  const task = taskById(state, taskId)
  if (!task) return null
  const day = findPlaylistContaining(state, taskId)
  return day ? { kind: 'agenda', day } : { kind: 'list', listId: task.listId }
}

/** Open (incomplete) task count for a day, used by the agenda tab badges. */
export function agendaOpenCount(state: AppState, day: PlaylistId): number {
  return agendaTasks(state, day).filter((task) => !task.completed).length
}
