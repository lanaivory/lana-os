import { isListSortMode, type ListSortMode } from './listSort'
import { isPlaylistId } from './board'
import { isMobileTab, type MobileTab } from './mobileTabs'
import type { PlaylistId } from './types'

/**
 * Mobile view state is per device, not per account: which tab is open and
 * which day each surface is showing should not travel through Vercel KV and
 * fight the desktop board over synced state.
 */
export type MobilePrefs = {
  tab: MobileTab
  /** Day shown on the Playlist tab. */
  playlistDay: PlaylistId
  /** Day shown on the Calendar tab, tracked apart from the playlist. */
  calendarDay: PlaylistId
  listSort: ListSortMode
}

const PREFS_KEY = 'lana-os:mobile:v1'
/** Superseded by `listSort` inside PREFS_KEY; read once so the choice survives. */
const LEGACY_SORT_KEY = 'lana-os:list-sort-mode'

export const DEFAULT_MOBILE_PREFS: MobilePrefs = {
  tab: 'playlist',
  playlistDay: 'today',
  calendarDay: 'today',
  listSort: 'custom',
}

function playlistDayOr(value: unknown, fallback: PlaylistId): PlaylistId {
  return typeof value === 'string' && isPlaylistId(value) ? value : fallback
}

export function normalizeMobilePrefs(raw: unknown): MobilePrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_MOBILE_PREFS }
  const value = raw as Record<string, unknown>
  return {
    tab: isMobileTab(value.tab) ? value.tab : DEFAULT_MOBILE_PREFS.tab,
    // `agendaDay` is the pre-tabs name for the same choice.
    playlistDay: playlistDayOr(
      value.playlistDay ?? value.agendaDay,
      DEFAULT_MOBILE_PREFS.playlistDay,
    ),
    calendarDay: playlistDayOr(
      value.calendarDay,
      DEFAULT_MOBILE_PREFS.calendarDay,
    ),
    listSort: isListSortMode(value.listSort)
      ? value.listSort
      : DEFAULT_MOBILE_PREFS.listSort,
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
