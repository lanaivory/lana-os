import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { dayOpenCount } from '../../lib/mobileSelectors'
import type { AppState, PlaylistId } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'

type Props = {
  state: AppState
  day: PlaylistId
  todayKey: string
  label: string
  onChange: (day: PlaylistId) => void
}

/**
 * Today / Tomorrow / This Week switcher. Tap a day, or flick along the strip
 * itself to step through them — the days are changed from here and nowhere
 * else, because left and right over the queue below belongs to its rows.
 */
export function DayTabs({ state, day, todayKey, label, onChange }: Props) {
  const step = (delta: number) => {
    const next = PLAYLIST_CARD_IDS[PLAYLIST_CARD_IDS.indexOf(day) + delta]
    if (next) onChange(next)
  }
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
  })

  return (
    <div className="mos-daytabs" role="tablist" aria-label={label} {...swipe}>
      {PLAYLIST_CARD_IDS.map((id) => {
        const selected = id === day
        const open = dayOpenCount(state, id, todayKey)
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`mos-daytabs__tab${selected ? ' is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <span>{PLAYLIST_META[id].name}</span>
            {open > 0 && <span className="mos-daytabs__count">{open}</span>}
          </button>
        )
      })}
    </div>
  )
}
