import type { Task } from './types'

/** Freshly-captured tasks keep a subtle "new" marker for two hours. */
export const NEW_TASK_TTL_MS = 2 * 60 * 60 * 1000

/** True when the task still qualifies for the new-dot indicator. */
export function taskShowsNew(
  task: Pick<Task, 'isNew' | 'createdAt'>,
  now: number = Date.now(),
): boolean {
  if (!task.isNew) return false
  if (!Number.isFinite(task.createdAt)) return false
  return now - task.createdAt < NEW_TASK_TTL_MS
}
