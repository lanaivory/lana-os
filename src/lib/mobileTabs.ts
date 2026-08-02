/** The four surfaces of the mobile app, in bottom-bar order. */
export type MobileTab = 'playlist' | 'lists' | 'calendar' | 'settings'

export const MOBILE_TABS: MobileTab[] = [
  'playlist',
  'lists',
  'calendar',
  'settings',
]

export const MOBILE_TAB_LABELS: Record<MobileTab, string> = {
  playlist: 'Playlist',
  lists: 'Lists',
  calendar: 'Calendar',
  settings: 'Settings',
}

export function isMobileTab(value: unknown): value is MobileTab {
  return (
    value === 'playlist' ||
    value === 'lists' ||
    value === 'calendar' ||
    value === 'settings'
  )
}
