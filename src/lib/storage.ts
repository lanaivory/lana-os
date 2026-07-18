import { createEmptyState, type AppState } from './types'

const STORAGE_KEY = 'lana-os:v1'

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyState()
    const parsed = JSON.parse(raw) as AppState
    return migrateState(parsed)
  } catch {
    return createEmptyState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function migrateState(state: Partial<AppState>): AppState {
  const empty = createEmptyState()
  return {
    tasks: state.tasks ?? empty.tasks,
    lists: state.lists?.length ? state.lists : empty.lists,
    playlists: {
      today: state.playlists?.today ?? [],
      tomorrow: state.playlists?.tomorrow ?? [],
      week: state.playlists?.week ?? [],
    },
    lastRolloverDate: state.lastRolloverDate ?? '',
    collapsedPlaylists: {
      today: state.collapsedPlaylists?.today ?? false,
      tomorrow: state.collapsedPlaylists?.tomorrow ?? false,
      week: state.collapsedPlaylists?.week ?? true,
    },
  }
}

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
