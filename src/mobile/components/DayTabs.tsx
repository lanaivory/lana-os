import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { agendaOpenCount } from '../../lib/mobileSelectors'
import type { AppState, PlaylistId } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'

type Props = {
  state: AppState
  day: PlaylistId
  label: string
  onChange: (day: PlaylistId) => void
}

/** Today / Tomorrow / This Week switcher, shared by Playlist and Calendar. */
export function DayTabs({ state, day, label, onChange }: Props) {
  return (
    <div className="mos-daytabs" role="tablist" aria-label={label}>
      {PLAYLIST_CARD_IDS.map((id) => {
        const selected = id === day
        const open = agendaOpenCount(state, id)
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
