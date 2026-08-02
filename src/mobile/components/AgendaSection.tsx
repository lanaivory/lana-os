import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { agendaOpenCount, agendaTasks } from '../../lib/mobileSelectors'
import type { AppState, PlaylistId } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'
import { TaskRow } from './TaskRow'

type Props = {
  state: AppState
  day: PlaylistId
  query: string
  liveDate: string
  onDayChange: (day: PlaylistId) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
}

/**
 * Today / Tomorrow / This Week. Only the selected day is mounted, so the
 * section is always exactly as tall as what it shows — no measured heights,
 * no horizontal scroll container competing with the page scroll.
 */
export function AgendaSection({
  state,
  day,
  query,
  liveDate,
  onDayChange,
  onToggleTask,
  onOpenTask,
}: Props) {
  const index = PLAYLIST_CARD_IDS.indexOf(day)
  const step = (delta: number) => {
    const next = PLAYLIST_CARD_IDS[index + delta]
    if (next) onDayChange(next)
  }
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => step(1),
    onSwipeRight: () => step(-1),
  })

  const tasks = agendaTasks(state, day)

  return (
    <section className="mos-agenda" aria-label="Agenda">
      <div className="mos-agenda__tabs" role="tablist" aria-label="Agenda day">
        {PLAYLIST_CARD_IDS.map((id) => {
          const selected = id === day
          const open = agendaOpenCount(state, id)
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`mos-agenda__tab${selected ? ' is-active' : ''}`}
              onClick={() => onDayChange(id)}
            >
              <span>{PLAYLIST_META[id].name}</span>
              {open > 0 && <span className="mos-agenda__count">{open}</span>}
            </button>
          )
        })}
      </div>

      <div
        className="mos-agenda__page"
        role="tabpanel"
        aria-label={PLAYLIST_META[day].name}
        key={day}
        {...swipe}
      >
        <p className="mos-agenda__caption">
          {day === 'today' ? liveDate : PLAYLIST_META[day].hint}
        </p>

        {tasks.length === 0 ? (
          <p className="mos-agenda__empty">
            Nothing planned. Open a task below to add it here.
          </p>
        ) : (
          <ul className="mos-tasks">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                lists={state.lists}
                query={query}
                showTime={day !== 'week'}
                showListTag
                onToggle={onToggleTask}
                onOpen={onOpenTask}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
