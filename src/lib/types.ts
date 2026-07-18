export type PlaylistId = 'today' | 'tomorrow' | 'week'

export type Task = {
  id: string
  text: string
  listId: string
  completed: boolean
  completedAt: number | null
  createdAt: number
  /** Optional HH:MM for time-blocked planning */
  time: string | null
  /** True when carried past a planning day without completion */
  overdue: boolean
}

export type ContextList = {
  id: string
  name: string
  collapsed: boolean
  /** Soft accent used for list tags */
  color: string
}

export type Playlists = {
  today: string[]
  tomorrow: string[]
  week: string[]
}

export type AppState = {
  tasks: Record<string, Task>
  lists: ContextList[]
  playlists: Playlists
  /** Local calendar date (YYYY-MM-DD) of last morning rollover */
  lastRolloverDate: string
  collapsedPlaylists: Record<PlaylistId, boolean>
}

export const DEFAULT_LISTS: ContextList[] = [
  { id: 'inbox', name: 'Inbox', collapsed: false, color: '#8b919a' },
  { id: 'personal', name: 'Personal', collapsed: false, color: '#7eb8a2' },
  { id: 'content', name: 'Content', collapsed: false, color: '#d4a574' },
  { id: 'follow-up', name: 'Follow-up', collapsed: false, color: '#8fa8c8' },
  { id: 'errands', name: 'Errands', collapsed: false, color: '#c48b7a' },
  { id: 'reading', name: 'Reading', collapsed: false, color: '#a89bc8' },
]

export const PLAYLIST_META: Record<
  PlaylistId,
  { name: string; hint: string }
> = {
  today: { name: 'Today', hint: 'Time-blocked plan' },
  tomorrow: { name: 'Tomorrow', hint: 'Ready for morning' },
  week: { name: 'This Week', hint: 'Soft commitments' },
}

export function createEmptyState(): AppState {
  return {
    tasks: {},
    lists: DEFAULT_LISTS.map((l) => ({ ...l })),
    playlists: { today: [], tomorrow: [], week: [] },
    lastRolloverDate: '',
    collapsedPlaylists: { today: false, tomorrow: false, week: true },
  }
}
