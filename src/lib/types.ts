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
  /** Highlight tasks that just arrived via text capture */
  isNew: boolean
  /**
   * Set when capture could not confidently pick a list, so the task waits in
   * the mobile triage banner instead of quietly landing in the fallback list.
   */
  needsTriage?: boolean
}

export type ContextList = {
  id: string
  name: string
  collapsed: boolean
  /** Soft accent used for list tags */
  color: string
  /** Pinned lists float to their own section at the top of the Lists tab. */
  pinned?: boolean
}

/**
 * A dated thing you have committed to: it has a day (and maybe a clock time),
 * unlike a task, which only ever has a planning day and an optional time.
 */
export type Commitment = {
  id: string
  title: string
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string
  /** Optional `HH:MM`. */
  time: string | null
  /**
   * Minutes before the commitment to fire a web push. `0` means at the time
   * itself; `null` means no reminder.
   */
  reminderMinutesBefore: number | null
  /**
   * Absolute epoch ms the reminder is due, resolved on the device that created
   * it. The server only compares numbers, so it never has to guess a timezone.
   */
  reminderAt: number | null
  /** Epoch ms the reminder push went out, so it only ever fires once. */
  reminderSentAt: number | null
  /** Optional owning context list, used for the trailing list name on a row. */
  listId: string | null
  done: boolean
  createdAt: number
}

/** What capture does with text the classifier cannot place. */
export type UnsureCaptureMode = 'ask' | 'file'

export type Playlists = {
  today: string[]
  tomorrow: string[]
  week: string[]
}

/** Soft-deleted task kept in Recently Deleted for 24 hours. */
export type TrashTaskEntry = {
  kind: 'task'
  deletedAt: number
  task: Task
  /** Playlist memberships at delete time (Today / Tomorrow / This Week). */
  playlists: PlaylistId[]
  /** Index within the owning list's order at delete time. */
  listOrderIndex: number
}

/** Soft-deleted list kept with its tasks for joint restore. */
export type TrashListEntry = {
  kind: 'list'
  deletedAt: number
  list: ContextList
  tasks: Array<{
    task: Task
    playlists: PlaylistId[]
  }>
  listOrder: string[]
  boardColumn: number
  boardIndex: number
}

export type TrashEntry = TrashTaskEntry | TrashListEntry

export type AppState = {
  tasks: Record<string, Task>
  lists: ContextList[]
  playlists: Playlists
  /** Local calendar date (YYYY-MM-DD) of last morning rollover */
  lastRolloverDate: string
  collapsedPlaylists: Record<PlaylistId, boolean>
  theme: ThemeMode
  sortTodayByTime: boolean
  /**
   * When false, task titles stay on one line and scroll horizontally
   * inside the row (lists + playlists).
   */
  wrapTaskTitles: boolean
  /**
   * Per-task title wrap overrides. When set, wins over `wrapTaskTitles`
   * for that task id (double-tap toggle on mobile).
   */
  taskTitleWrapOverrides: Record<string, boolean>
  /** Whether first-run demo content was applied */
  seeded: boolean
  /** 2D board: each column is a top-to-bottom stack of card ids */
  boardColumns: string[][]
  /** Optional custom card body heights (px) */
  cardHeights: Record<string, number>
  /** Optional custom widths for board cards / list columns (px) */
  cardWidths: Record<string, number>
  /** Explicit task order inside each context list */
  listOrders: Record<string, string[]>
  /**
   * Version of the canonical context-list set.
   * Bumped when DEFAULT_LISTS changes so existing KV/local state migrates once.
   */
  listsVersion: number
  /** Soft-deleted tasks/lists retained for 24 hours. */
  trash: TrashEntry[]
  /** Dated commitments shown on the Calendar tab. */
  commitments: Commitment[]
  /** Ask (triage banner) or auto-file unsure captures into `unsureListId`. */
  unsureCapture: UnsureCaptureMode
  /** Destination for unsure captures when `unsureCapture` is `file`. */
  unsureListId: string
}

/** Where unsure captures land when the user has not chosen a list. */
export const DEFAULT_UNSURE_LIST_ID = 'random'

/** Bump when the seeded context-list set or ids change. */
export const LISTS_VERSION = 2

export const DEFAULT_LISTS: ContextList[] = [
  { id: 'linkedin-todo', name: 'LinkedIn to-do', collapsed: false, color: '#6a8caf' },
  { id: 'instagram-todo', name: 'Instagram to-do', collapsed: false, color: '#c47a9a' },
  { id: 'content-todo', name: 'Content to-do', collapsed: false, color: '#d4a574' },
  { id: 'c2c-todo', name: 'C2C to-do', collapsed: false, color: '#7aa8b8' },
  { id: 'linkedin', name: 'LinkedIn', collapsed: false, color: '#5b7fa6' },
  { id: 'personal', name: 'Personal', collapsed: false, color: '#7eb8a2' },
  { id: 'meta', name: 'Meta', collapsed: false, color: '#8fa8c8' },
  { id: 'appointments', name: 'Appointments', collapsed: false, color: '#c9b27c' },
  { id: 'random', name: 'Random', collapsed: false, color: '#8b919a' },
  { id: 'follow-ups', name: 'Follow-ups', collapsed: false, color: '#9a8fc8' },
  { id: 'content-ideas', name: 'Content ideas', collapsed: false, color: '#c4a06a' },
  { id: 'lovable', name: 'Lovable', collapsed: false, color: '#c48b9a' },
  { id: 'later', name: 'Later', collapsed: false, color: '#7a8b9a' },
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
  '#6a8caf',
  '#c47a9a',
  '#d4a574',
  '#7aa8b8',
  '#5b7fa6',
  '#7eb8a2',
  '#8fa8c8',
  '#c9b27c',
  '#8b919a',
  '#9a8fc8',
  '#c4a06a',
  '#c48b9a',
  '#7a8b9a',
  '#c48b7a',
  '#a89bc8',
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
    wrapTaskTitles: false,
    taskTitleWrapOverrides: {},
    seeded: false,
    boardColumns: [
      ['today', 'tomorrow', 'week'],
      listIds.slice(0, 3),
      listIds.slice(3, 6),
      listIds.slice(6, 9),
      listIds.slice(9, 12),
      listIds.slice(12),
    ],
    cardHeights: {},
    cardWidths: {},
    listOrders: {},
    listsVersion: LISTS_VERSION,
    trash: [],
    commitments: [],
    unsureCapture: 'ask',
    unsureListId: DEFAULT_UNSURE_LIST_ID,
  }
}
