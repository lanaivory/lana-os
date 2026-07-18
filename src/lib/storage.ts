import { ensureBoardHasCards, defaultBoardColumns } from './board'
import { createDemoState } from './demo'
import { createEmptyState, type AppState } from './types'

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

function migrateState(state: Partial<AppState>): AppState {
  const empty = createEmptyState()
  const lists = state.lists?.length ? state.lists : empty.lists
  const listIds = lists.map((l) => l.id)
  const boardColumns = ensureBoardHasCards(
    state.boardColumns?.length
      ? state.boardColumns
      : defaultBoardColumns(listIds),
    listIds,
  )

  return {
    tasks: state.tasks ?? empty.tasks,
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
    seeded: Boolean(state.seeded),
    boardColumns,
    cardHeights: state.cardHeights ?? {},
    cardWidths: state.cardWidths ?? {},
    listOrders: state.listOrders ?? {},
  }
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
