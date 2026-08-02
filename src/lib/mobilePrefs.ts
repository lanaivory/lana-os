import { isListSortMode, type ListSortMode } from './listSort'
import { isPlaylistId } from './board'
import { isMobileTab, type MobileTab } from './mobileTabs'
import { isShuffleSource, type ShuffleSource } from './nowCard'
import type { PlaylistId } from './types'

/**
 * Mobile view state is per device, not per account: which tab is open and
 * which day each surface is showing should not travel through Vercel KV and
 * fight the desktop board over synced state.
 */

/** Which half of the Calendar agenda is showing. */
export type AgendaView = 'week' | 'upcoming'

export type AccentId = 'amber' | 'sage' | 'lilac' | 'rose' | 'sky'

export const ACCENTS: Array<{ id: AccentId; name: string; color: string }> = [
  { id: 'amber', name: 'Amber', color: '#d4a574' },
  { id: 'sage', name: 'Sage', color: '#7eb8a2' },
  { id: 'lilac', name: 'Lilac', color: '#a89bc8' },
  { id: 'rose', name: 'Rose', color: '#c88b9a' },
  { id: 'sky', name: 'Sky', color: '#7aa8c8' },
]

export type MobilePrefs = {
  tab: MobileTab
  /** Day shown on the Playlist tab. */
  playlistDay: PlaylistId
  listSort: ListSortMode
  agendaView: AgendaView
  accent: AccentId
  /** How far ahead the Now card commits to a timed task. */
  nowLeadMinutes: number
  /** Where the Now card's shuffle draws untimed tasks from. */
  shuffleSource: ShuffleSource
  /** Set once the first-run checklist has been dismissed. */
  onboarded: boolean
  /** Manual inbound number, used when the server does not report one. */
  captureNumber: string
  /** Read-only calendar feed (Google's secret iCal address), optional. */
  calendarFeedUrl: string
}

const PREFS_KEY = 'lana-os:mobile:v1'
/** Superseded by `listSort` inside PREFS_KEY; read once so the choice survives. */
const LEGACY_SORT_KEY = 'lana-os:list-sort-mode'

export const NOW_LEAD_MINUTES = [15, 30]

export const DEFAULT_MOBILE_PREFS: MobilePrefs = {
  tab: 'playlist',
  playlistDay: 'today',
  listSort: 'custom',
  agendaView: 'week',
  accent: 'amber',
  nowLeadMinutes: 30,
  shuffleSource: 'today',
  onboarded: false,
  captureNumber: '',
  calendarFeedUrl: '',
}

function playlistDayOr(value: unknown, fallback: PlaylistId): PlaylistId {
  return typeof value === 'string' && isPlaylistId(value) ? value : fallback
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value.trim() : fallback
}

export function isAccentId(value: unknown): value is AccentId {
  return ACCENTS.some((accent) => accent.id === value)
}

export function accentColor(id: AccentId): string {
  return (
    ACCENTS.find((accent) => accent.id === id)?.color ?? ACCENTS[0].color
  )
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
    listSort: isListSortMode(value.listSort)
      ? value.listSort
      : DEFAULT_MOBILE_PREFS.listSort,
    agendaView: value.agendaView === 'upcoming' ? 'upcoming' : 'week',
    accent: isAccentId(value.accent)
      ? value.accent
      : DEFAULT_MOBILE_PREFS.accent,
    nowLeadMinutes: NOW_LEAD_MINUTES.includes(Number(value.nowLeadMinutes))
      ? Number(value.nowLeadMinutes)
      : DEFAULT_MOBILE_PREFS.nowLeadMinutes,
    shuffleSource: isShuffleSource(value.shuffleSource)
      ? value.shuffleSource
      : DEFAULT_MOBILE_PREFS.shuffleSource,
    onboarded: Boolean(value.onboarded),
    captureNumber: stringOr(
      value.captureNumber,
      DEFAULT_MOBILE_PREFS.captureNumber,
    ),
    calendarFeedUrl: stringOr(
      value.calendarFeedUrl,
      DEFAULT_MOBILE_PREFS.calendarFeedUrl,
    ),
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
