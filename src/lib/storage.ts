import { ensureBoardHasCards, defaultBoardColumns } from './board'
import { createDemoState } from './demo'
import { ensureBuiltinLists, migrateCanonicalLists } from './lists'
import { trashedListIds } from './trash'
import {
  createEmptyState,
  LISTS_VERSION,
  type AppState,
  type PlaylistId,
  type Task,
  type TrashEntry,
} from './types'

const STORAGE_KEY = 'lana-os:v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const demo = createDemoState()
      saveState(demo)
      return demo
    }
    const parsed = JSON.parse(raw) as AppState
    const migrated = migrateState(parsed)
    if (!migrated.seeded && Object.keys(migrated.tasks).length === 0) {
      const demo = createDemoState()
      saveState(demo)
      return demo
    }
    return migrated
  } catch {
    return createDemoState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function migrateState(state: Partial<AppState>): AppState {
  const empty = createEmptyState()
  const trash = migrateTrash(state.trash)
  const excluded = trashedListIds(trash)
  const lists = ensureBuiltinLists(
    state.lists?.length ? state.lists : empty.lists,
    { excludeIds: excluded },
  )
  const listIds = lists.map((l) => l.id)
  const boardColumns = ensureBoardHasCards(
    state.boardColumns?.length
      ? state.boardColumns
      : defaultBoardColumns(listIds),
    listIds,
  )

  const tasks: Record<string, Task> = {}
  for (const [id, task] of Object.entries(state.tasks ?? {})) {
    tasks[id] = {
      ...task,
      isNew: Boolean(task.isNew),
    }
  }

  const base: AppState = {
    tasks,
    lists,
    playlists: {
      today: state.playlists?.today ?? [],
      tomorrow: state.playlists?.tomorrow ?? [],
      week: state.playlists?.week ?? [],
    },
    lastRolloverDate: state.lastRolloverDate ?? '',
    collapsedPlaylists: {
      today: state.collapsedPlaylists?.today ?? false,
      tomorrow: state.collapsedPlaylists?.tomorrow ?? false,
      week: state.collapsedPlaylists?.week ?? false,
    },
    theme: state.theme === 'light' ? 'light' : 'dark',
    sortTodayByTime: Boolean(state.sortTodayByTime),
    wrapTaskTitles:
      typeof state.wrapTaskTitles === 'boolean' ? state.wrapTaskTitles : true,
    seeded: Boolean(state.seeded),
    boardColumns,
    cardHeights: state.cardHeights ?? {},
    cardWidths: state.cardWidths ?? {},
    listOrders: state.listOrders ?? {},
    listsVersion: typeof state.listsVersion === 'number' ? state.listsVersion : 0,
    trash,
  }

  return migrateCanonicalLists(base, {
    excludeListIds: excluded,
  })
}

function migrateTrash(raw: unknown): TrashEntry[] {
  if (!Array.isArray(raw)) return []
  const out: TrashEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const entry = item as Partial<TrashEntry> & { kind?: string }
    if (typeof entry.deletedAt !== 'number') continue
    if (entry.kind === 'task' && entry.task && typeof entry.task === 'object') {
      const task = entry.task as Task
      if (!task.id || !task.text) continue
      out.push({
        kind: 'task',
        deletedAt: entry.deletedAt,
        task: { ...task, isNew: Boolean(task.isNew) },
        playlists: normalizePlaylistIds(
          (entry as { playlists?: unknown }).playlists,
        ),
        listOrderIndex:
          typeof (entry as { listOrderIndex?: unknown }).listOrderIndex ===
          'number'
            ? (entry as { listOrderIndex: number }).listOrderIndex
            : 0,
      })
      continue
    }
    if (entry.kind === 'list' && entry.list && typeof entry.list === 'object') {
      const list = entry.list as ContextListLike
      if (!list.id || !list.name) continue
      const tasksRaw = Array.isArray((entry as { tasks?: unknown }).tasks)
        ? ((entry as { tasks: unknown[] }).tasks)
        : []
      out.push({
        kind: 'list',
        deletedAt: entry.deletedAt,
        list: {
          id: list.id,
          name: list.name,
          collapsed: Boolean(list.collapsed),
          color: typeof list.color === 'string' ? list.color : '#8b919a',
        },
        tasks: tasksRaw.flatMap((row) => {
          if (!row || typeof row !== 'object') return []
          const t = (row as { task?: Task }).task
          if (!t?.id || !t.text) return []
          return [
            {
              task: { ...t, isNew: Boolean(t.isNew) },
              playlists: normalizePlaylistIds(
                (row as { playlists?: unknown }).playlists,
              ),
            },
          ]
        }),
        listOrder: Array.isArray((entry as { listOrder?: unknown }).listOrder)
          ? ((entry as { listOrder: string[] }).listOrder.filter(
              (id) => typeof id === 'string',
            ))
          : [],
        boardColumn:
          typeof (entry as { boardColumn?: unknown }).boardColumn === 'number'
            ? (entry as { boardColumn: number }).boardColumn
            : 0,
        boardIndex:
          typeof (entry as { boardIndex?: unknown }).boardIndex === 'number'
            ? (entry as { boardIndex: number }).boardIndex
            : 0,
      })
    }
  }
  return out
}

type ContextListLike = {
  id?: string
  name?: string
  collapsed?: boolean
  color?: string
}

function normalizePlaylistIds(raw: unknown): PlaylistId[] {
  if (!Array.isArray(raw)) return []
  const allowed: PlaylistId[] = ['today', 'tomorrow', 'week']
  return raw.filter((id): id is PlaylistId =>
    allowed.includes(id as PlaylistId),
  )
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export { LISTS_VERSION }
