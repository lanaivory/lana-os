export type PlaylistId = 'today' | 'tomorrow' | 'week'
export type ThemeMode = 'dark' | 'light'

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
  theme: ThemeMode
  sortTodayByTime: boolean
  /** Whether first-run demo content was applied */
  seeded: boolean
  /** 2D board: each column is a top-to-bottom stack of card ids */
  boardColumns: string[][]
  /** Optional custom card body heights (px) */
  cardHeights: Record<string, number>
  /** Optional custom widths for playlist cards (px) */
  cardWidths: Record<string, number>
  /** Explicit task order inside each context list */
  listOrders: Record<string, string[]>
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

export const LIST_COLORS = [
  '#8b919a',
  '#7eb8a2',
  '#d4a574',
  '#8fa8c8',
  '#c48b7a',
  '#a89bc8',
  '#c9b27c',
  '#7aa8b8',
]

export function createEmptyState(): AppState {
  const lists = DEFAULT_LISTS.map((l) => ({ ...l }))
  const listIds = lists.map((l) => l.id)
  return {
    tasks: {},
    lists,
    playlists: { today: [], tomorrow: [], week: [] },
    lastRolloverDate: '',
    collapsedPlaylists: { today: false, tomorrow: false, week: false },
    theme: 'dark',
    sortTodayByTime: false,
    seeded: false,
    boardColumns: [
      ['today', 'tomorrow', 'week'],
      listIds.slice(0, 3),
      listIds.slice(3),
    ],
    cardHeights: {},
    cardWidths: {},
    listOrders: {},
  }
}
