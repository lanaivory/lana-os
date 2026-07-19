import type { ContextList } from './types'
import { DEFAULT_LISTS } from './types'

/** Ensure built-in lists (incl. Appointments) exist without dropping custom ones. */
export function ensureBuiltinLists(lists: ContextList[]): ContextList[] {
  const byId = new Map(lists.map((l) => [l.id, l]))
  const next: ContextList[] = []

  for (const def of DEFAULT_LISTS) {
    const existing = byId.get(def.id)
    if (existing) {
      next.push(existing)
      byId.delete(def.id)
    } else {
      next.push({ ...def })
    }
  }

  for (const list of lists) {
    if (!DEFAULT_LISTS.some((d) => d.id === list.id)) {
      next.push(list)
    }
  }

  return next
}
