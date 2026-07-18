import type { AppState, PlaylistId, Task } from './types'

export const COMPLETION_CLEAR_MS = 60 * 60 * 1000 // 1 hour

/**
 * Mark a task complete and stamp completedAt for delayed clearing.
 */
export function completeTask(task: Task, now = Date.now()): Task {
  return {
    ...task,
    completed: true,
    completedAt: now,
    overdue: false,
  }
}

/**
 * Undo completion while the grace window is open.
 */
export function uncompleteTask(task: Task): Task {
  return {
    ...task,
    completed: false,
    completedAt: null,
  }
}

/**
 * Remove tasks whose completion is older than the clear window.
 * Also strips their ids from every playlist.
 */
export function purgeStaleCompletions(
  state: AppState,
  now = Date.now(),
): AppState {
  const expired = new Set<string>()

  for (const [id, task] of Object.entries(state.tasks)) {
    if (
      task.completed &&
      task.completedAt != null &&
      now - task.completedAt >= COMPLETION_CLEAR_MS
    ) {
      expired.add(id)
    }
  }

  if (expired.size === 0) return state

  const tasks = { ...state.tasks }
  for (const id of expired) {
    delete tasks[id]
  }

  const strip = (ids: string[]) => ids.filter((id) => !expired.has(id))

  return {
    ...state,
    tasks,
    playlists: {
      today: strip(state.playlists.today),
      tomorrow: strip(state.playlists.tomorrow),
      week: strip(state.playlists.week),
    },
  }
}

/**
 * Fully delete a task from its list and every playlist.
 */
export function deleteTaskFromState(state: AppState, taskId: string): AppState {
  if (!state.tasks[taskId]) return state

  const tasks = { ...state.tasks }
  delete tasks[taskId]

  const strip = (ids: string[]) => ids.filter((id) => id !== taskId)
  const playlists = {
    today: strip(state.playlists.today),
    tomorrow: strip(state.playlists.tomorrow),
    week: strip(state.playlists.week),
  } satisfies Record<PlaylistId, string[]>

  return { ...state, tasks, playlists }
}

/**
 * Ms remaining until a completed task is auto-cleared (0 if due).
 */
export function msUntilClear(task: Task, now = Date.now()): number {
  if (!task.completed || task.completedAt == null) return Infinity
  return Math.max(0, COMPLETION_CLEAR_MS - (now - task.completedAt))
}
