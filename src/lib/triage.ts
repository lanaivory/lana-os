import { recentlyUsedListIds, suggestLists } from './listSuggest'
import type { AppState, ContextList, Task } from './types'

/**
 * Captures the classifier could not place. They still live somewhere (nothing
 * is ever homeless), but they are flagged so the Lists tab can offer a one-tap
 * home instead of letting them rot in the fallback list.
 */

export type TriageCard = {
  task: Task
  /** Lists worth offering for this text, best first. */
  suggestions: ContextList[]
}

export function tasksNeedingTriage(state: AppState): Task[] {
  return Object.values(state.tasks)
    .filter((task) => task.needsTriage && !task.completed)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function triageCount(state: AppState): number {
  return tasksNeedingTriage(state).length
}

/** One card per unplaced capture: the raw text plus the lists to offer. */
export function triageCards(state: AppState, limit = 3): TriageCard[] {
  const byId = new Map(state.lists.map((list) => [list.id, list]))
  // Unplaced text has no keyword match by definition, so habit is the signal.
  const recentListIds = recentlyUsedListIds(state)
  return tasksNeedingTriage(state)
    .slice(0, limit)
    .map((task) => ({
      task,
      suggestions: suggestLists(task.text, {
        lists: state.lists,
        recentListIds,
        limit,
      }).flatMap((listId) => {
        const list = byId.get(listId)
        return list ? [list] : []
      }),
    }))
}
