import { isListSortMode, type ListSortMode } from './listSort'
import { isPlaylistId } from './board'
import type { PlaylistId } from './types'

/**
 * Mobile view state is per device, not per account: which day the agenda shows
 * and which lists are folded away on a phone should not travel through Vercel KV
 * and fight the desktop board over the synced `collapsed` flags.
 */
export type MobilePrefs = {
  agendaDay: PlaylistId
  listSort: ListSortMode
  /**
   * Explicit per-list fold choices. A list with no entry falls back to the
   * default in `isListCollapsed`: empty lists start folded, others start open.
   */
  listCollapse: Record<string, boolean>
}

const PREFS_KEY = 'lana-os:mobile:v1'
/** Superseded by `listSort` inside PREFS_KEY; read once so the choice survives. */
const LEGACY_SORT_KEY = 'lana-os:list-sort-mode'

export const DEFAULT_MOBILE_PREFS: MobilePrefs = {
  agendaDay: 'today',
  listSort: 'custom',
  listCollapse: {},
}

function normalizeCollapseMap(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, boolean> = {}
  for (const [id, collapsed] of Object.entries(raw as Record<string, unknown>)) {
    if (id && typeof collapsed === 'boolean') out[id] = collapsed
  }
  return out
}

export function normalizeMobilePrefs(raw: unknown): MobilePrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_MOBILE_PREFS }
  const value = raw as Partial<MobilePrefs>
  return {
    agendaDay:
      typeof value.agendaDay === 'string' && isPlaylistId(value.agendaDay)
        ? value.agendaDay
        : DEFAULT_MOBILE_PREFS.agendaDay,
    listSort: isListSortMode(value.listSort)
      ? value.listSort
      : DEFAULT_MOBILE_PREFS.listSort,
    listCollapse: normalizeCollapseMap(value.listCollapse),
  }
}

export function loadMobilePrefs(): MobilePrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return normalizeMobilePrefs(JSON.parse(raw))

    const legacySort = localStorage.getItem(LEGACY_SORT_KEY)?.trim()
    return {
      ...DEFAULT_MOBILE_PREFS,
      listSort: isListSortMode(legacySort)
        ? legacySort
        : DEFAULT_MOBILE_PREFS.listSort,
    }
  } catch {
    return { ...DEFAULT_MOBILE_PREFS }
  }
}

export function saveMobilePrefs(prefs: MobilePrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Quota / private mode — prefs are a convenience, never a correctness need.
  }
}

export function withListCollapsed(
  prefs: MobilePrefs,
  listId: string,
  collapsed: boolean,
): MobilePrefs {
  if (prefs.listCollapse[listId] === collapsed) return prefs
  return {
    ...prefs,
    listCollapse: { ...prefs.listCollapse, [listId]: collapsed },
  }
}

/** Empty lists fold themselves away until the user says otherwise. */
export function isListCollapsed(
  prefs: MobilePrefs,
  listId: string,
  opts: { isEmpty: boolean },
): boolean {
  const explicit = prefs.listCollapse[listId]
  return explicit ?? opts.isEmpty
}
