import { withListOrderAppend } from './board'
import { classifyTask } from './classifier'
import { createId } from './id'
import { splitCaptureText } from './parseCapture'
import { smsTaskId } from './smsTaskIds'
import { routeTimingWords } from './timing'
import type { AppState, Task } from './types'

export type CaptureOpts = {
  fromText?: boolean
  messageSid?: string
  /** Override createdAt for deterministic tests. */
  now?: number
}

export type CaptureResult = {
  state: AppState
  createdIds: string[]
}

/** Prefer classifier target; fall back if that list is soft-deleted. */
export function resolveActiveListId(
  state: AppState,
  preferred: string,
): string {
  if (state.lists.some((l) => l.id === preferred)) return preferred
  if (state.lists.some((l) => l.id === 'random')) return 'random'
  return state.lists[0]?.id ?? preferred
}

/**
 * Same capture pipeline the client uses: split → classify → timing-route → board.
 * Idempotent for SMS ids — existing `sms_<sid>_<i>` tasks are left alone.
 */
export function applyCaptureToState(
  prev: AppState,
  raw: string,
  opts: CaptureOpts = {},
): CaptureResult {
  const pieces = splitCaptureText(raw)
  if (pieces.length === 0) {
    return { state: prev, createdIds: [] }
  }

  const tasks = { ...prev.tasks }
  let listOrders = { ...prev.listOrders }
  const playlists = {
    today: [...prev.playlists.today],
    tomorrow: [...prev.playlists.tomorrow],
    week: [...prev.playlists.week],
  }
  const createdIds: string[] = []
  const now = opts.now ?? Date.now()
  const sid = opts.messageSid?.trim()

  pieces.forEach((text, index) => {
    const classified = classifyTask(text)
    const listId = resolveActiveListId(prev, classified.listId)
    const { playlistId } = routeTimingWords(text)
    const id = sid ? smsTaskId(sid, index) : createId()
    // Inbox re-poll / webhook + poll: keep the deterministic SMS id stable.
    if (tasks[id]) return
    const task: Task = {
      id,
      text,
      listId,
      completed: false,
      completedAt: null,
      createdAt: now,
      time: null,
      overdue: false,
      // Fresh captures always get the short-lived "new" marker (UI expires at 2h).
      isNew: true,
    }
    tasks[id] = task
    createdIds.push(id)
    listOrders = withListOrderAppend(listOrders, listId, id)
    if (playlistId && !playlists[playlistId].includes(id)) {
      playlists[playlistId] = [...playlists[playlistId], id]
    }
  })

  if (createdIds.length === 0) {
    return { state: prev, createdIds: [] }
  }

  return {
    state: { ...prev, tasks, playlists, listOrders },
    createdIds,
  }
}

/** True when the first SMS task for this MessageSid already exists on the board. */
export function stateHasSmsMessage(state: AppState, messageSid: string): boolean {
  const sid = messageSid.trim()
  if (!sid) return false
  return Boolean(state.tasks[smsTaskId(sid, 0)])
}

/**
 * Preserve SMS tasks that landed via /api/sms webhook when a device pushes
 * an older local snapshot that does not yet include them.
 */
export function mergeMissingSmsTasks(
  local: AppState,
  remote: AppState,
): AppState {
  let tasks = local.tasks
  let listOrders = local.listOrders
  let playlists = local.playlists
  let changed = false

  for (const [id, task] of Object.entries(remote.tasks)) {
    if (!id.startsWith('sms_')) continue
    if (tasks[id]) continue
    if (!changed) {
      tasks = { ...tasks }
      listOrders = { ...listOrders }
      playlists = {
        today: [...playlists.today],
        tomorrow: [...playlists.tomorrow],
        week: [...playlists.week],
      }
      changed = true
    }
    tasks[id] = task
    listOrders = withListOrderAppend(listOrders, task.listId, id)
    for (const playlistId of ['today', 'tomorrow', 'week'] as const) {
      if (
        remote.playlists[playlistId].includes(id) &&
        !playlists[playlistId].includes(id)
      ) {
        playlists[playlistId] = [...playlists[playlistId], id]
      }
    }
  }

  if (!changed) return local
  return { ...local, tasks, listOrders, playlists }
}
