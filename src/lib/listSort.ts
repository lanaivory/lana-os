import type { Task } from './types'

export type ListSortMode = 'custom' | 'az' | 'recent'

export const LIST_SORT_MODES: ListSortMode[] = ['custom', 'az', 'recent']

export const LIST_SORT_LABELS: Record<ListSortMode, string> = {
  custom: 'Custom',
  az: 'A–Z',
  recent: 'Recently added',
}

const LIST_SORT_KEY = 'lana-os:list-sort-mode'

export function isListSortMode(value: unknown): value is ListSortMode {
  return value === 'custom' || value === 'az' || value === 'recent'
}

export function loadListSortMode(): ListSortMode {
  try {
    const raw = localStorage.getItem(LIST_SORT_KEY)?.trim()
    return isListSortMode(raw) ? raw : 'custom'
  } catch {
    return 'custom'
  }
}

export function saveListSortMode(mode: ListSortMode): void {
  try {
    localStorage.setItem(LIST_SORT_KEY, mode)
  } catch {
    // Quota / private mode — ignore.
  }
}

/** View-order sort for category lists. `custom` keeps the given order. */
export function sortTasksForListMode(
  tasks: Task[],
  mode: ListSortMode,
): Task[] {
  if (mode === 'custom' || tasks.length < 2) return tasks
  const next = [...tasks]
  if (mode === 'az') {
    next.sort((a, b) => {
      const byText = a.text.localeCompare(b.text, undefined, {
        sensitivity: 'base',
      })
      if (byText !== 0) return byText
      return a.createdAt - b.createdAt
    })
    return next
  }
  // Recently added: newest first; completed sink after open tasks.
  next.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return b.createdAt - a.createdAt
  })
  return next
}
