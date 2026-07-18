import { localDateKey } from './storage'
import type { AppState, Task } from './types'

/**
 * Morning rollover: move Tomorrow → Today, clear Tomorrow,
 * and mark unfinished Today items as overdue.
 * Idempotent per local calendar day via lastRolloverDate.
 */
export function applyMorningRollover(
  state: AppState,
  now = new Date(),
): AppState {
  const todayKey = localDateKey(now)
  if (state.lastRolloverDate === todayKey) {
    return state
  }

  // First launch: stamp today without mutating playlists.
  if (!state.lastRolloverDate) {
    return { ...state, lastRolloverDate: todayKey }
  }

  const unfinishedToday = state.playlists.today.filter((id) => {
    const task = state.tasks[id]
    return task && !task.completed
  })

  const tasks: Record<string, Task> = { ...state.tasks }
  for (const id of unfinishedToday) {
    const task = tasks[id]
    if (task) {
      tasks[id] = { ...task, overdue: true }
    }
  }

  const tomorrowIds = state.playlists.tomorrow.filter((id) => tasks[id])
  const mergedToday = [
    ...unfinishedToday,
    ...tomorrowIds.filter((id) => !unfinishedToday.includes(id)),
  ]

  // Drop completed refs from today's carry-over path.
  const cleanedToday = mergedToday.filter((id) => {
    const t = tasks[id]
    return t && !t.completed
  })

  return {
    ...state,
    tasks,
    playlists: {
      ...state.playlists,
      today: cleanedToday,
      tomorrow: [],
    },
    lastRolloverDate: todayKey,
  }
}
