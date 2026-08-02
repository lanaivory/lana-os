import type { ReactNode } from 'react'
import {
  MOBILE_TABS,
  MOBILE_TAB_LABELS,
  type MobileTab,
} from '../../lib/mobileTabs'
import {
  CalendarTabIcon,
  ListsTabIcon,
  PlaylistTabIcon,
  SettingsTabIcon,
} from './icons'

const TAB_ICONS: Record<MobileTab, () => ReactNode> = {
  playlist: PlaylistTabIcon,
  lists: ListsTabIcon,
  calendar: CalendarTabIcon,
  settings: SettingsTabIcon,
}

type Props = {
  tab: MobileTab
  /** Small counts on the tab, e.g. how much is planned for today. */
  badges?: Partial<Record<MobileTab, number>>
  onSelect: (tab: MobileTab) => void
}

/** The app's primary navigation: one row, always reachable with a thumb. */
export function TabBar({ tab, badges, onSelect }: Props) {
  return (
    <nav className="mos-tabbar" aria-label="Sections">
      {MOBILE_TABS.map((id) => {
        const Icon = TAB_ICONS[id]
        const active = id === tab
        const badge = badges?.[id] ?? 0
        return (
          <button
            key={id}
            type="button"
            className={`mos-tabbar__tab${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect(id)}
          >
            <span className="mos-tabbar__icon">
              <Icon />
              {badge > 0 && (
                <span className="mos-tabbar__badge" aria-hidden>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </span>
            <span className="mos-tabbar__label">{MOBILE_TAB_LABELS[id]}</span>
          </button>
        )
      })}
    </nav>
  )
}
