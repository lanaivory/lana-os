import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { agendaTasks } from '../../lib/mobileSelectors'
import type { AppState, PlaylistId } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { DayTabs } from '../components/DayTabs'
import { PlusIcon } from '../components/icons'
import { TaskRow } from '../components/TaskRow'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'

type Props = {
  state: AppState
  day: PlaylistId
  liveDate: string
  onDayChange: (day: PlaylistId) => void
  onToggleTask: (taskId: string) => void
  onOpenTask: (taskId: string) => void
  onPlanFromLists: () => void
}

/**
 * The plan for a day: one playlist at a time, in the order it will be worked.
 * Only the selected day is mounted, so the screen is exactly as tall as what
 * it shows and page scrolling stays native.
 */
export function PlaylistScreen({
  state,
  day,
  liveDate,
  onDayChange,
  onToggleTask,
  onOpenTask,
  onPlanFromLists,
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
  const done = tasks.filter((task) => task.completed).length

  return (
    <div className="mos-scroll" {...swipe}>
      <DayTabs
        state={state}
        day={day}
        label="Planning day"
        onChange={onDayChange}
      />

      <section className="mos-day" key={day} aria-label={PLAYLIST_META[day].name}>
        <p className="mos-day__caption">
          {day === 'today' ? liveDate : PLAYLIST_META[day].hint}
          {tasks.length > 0 && ` · ${done}/${tasks.length} done`}
        </p>

        {tasks.length === 0 ? (
          <p className="mos-empty">
            Nothing planned yet. Pull a few tasks over from your lists.
          </p>
        ) : (
          <ul className="mos-tasks">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                lists={state.lists}
                query=""
                showTime={day !== 'week'}
                showListTag
                onToggle={onToggleTask}
                onOpen={onOpenTask}
              />
            ))}
          </ul>
        )}

        <button type="button" className="mos-ghost-btn" onClick={onPlanFromLists}>
          <PlusIcon />
          Add from lists
        </button>
      </section>
    </div>
  )
}
