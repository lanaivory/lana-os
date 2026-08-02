import { useMemo } from 'react'
import {
  dayDate,
  daySchedule,
  formatHourLabel,
  nowMarker,
} from '../../lib/calendar'
import { agendaTasks } from '../../lib/mobileSelectors'
import { formatPlanTime } from '../../lib/timeFormat'
import type { AppState, PlaylistId } from '../../lib/types'
import { DayTabs } from '../components/DayTabs'
import { PlusIcon } from '../components/icons'
import { TaskRow } from '../components/TaskRow'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'
import { PLAYLIST_CARD_IDS } from '../../lib/board'

type Props = {
  state: AppState
  day: PlaylistId
  now: Date
  onDayChange: (day: PlaylistId) => void
  onOpenTask: (taskId: string) => void
  onToggleTask: (taskId: string) => void
  onScheduleAt: (hour: number) => void
  onPlanFromLists: () => void
}

function formatDayHeading(day: PlaylistId, now: Date): string {
  const date = dayDate(day, now)
  if (!date) return 'Spread across the week'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * The clock view of a planning day. The board stores a time on a task but no
 * date, so Today and Tomorrow become hour timelines while This Week — which
 * spans days — stays a plain pool.
 */
export function CalendarScreen({
  state,
  day,
  now,
  onDayChange,
  onOpenTask,
  onToggleTask,
  onScheduleAt,
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

  const isToday = day === 'today'
  const schedule = useMemo(
    () =>
      daySchedule(state, day, isToday ? { nowHour: now.getHours() } : {}),
    [state, day, isToday, now],
  )
  const marker = isToday ? nowMarker(now, schedule.hours) : null
  const weekTasks = day === 'week' ? agendaTasks(state, 'week') : []

  return (
    <div className="mos-scroll" {...swipe}>
      <DayTabs
        state={state}
        day={day}
        label="Calendar day"
        onChange={onDayChange}
      />

      <p className="mos-day__caption">{formatDayHeading(day, now)}</p>

      {day === 'week' ? (
        <section className="mos-day" aria-label="This week">
          <p className="mos-note">
            This Week holds soft commitments with no day of their own. Move one
            to Today or Tomorrow to give it a time.
          </p>
          {weekTasks.length === 0 ? (
            <p className="mos-empty">Nothing waiting this week.</p>
          ) : (
            <ul className="mos-tasks">
              {weekTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  lists={state.lists}
                  query=""
                  showListTag
                  onToggle={onToggleTask}
                  onOpen={onOpenTask}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {schedule.untimed.length > 0 && (
            <section className="mos-tray" aria-label="Waiting for a time">
              <h2 className="mos-group__title">
                No time yet · {schedule.untimed.length}
              </h2>
              <ul className="mos-tasks">
                {schedule.untimed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    lists={state.lists}
                    query=""
                    showListTag
                    onToggle={onToggleTask}
                    onOpen={onOpenTask}
                  />
                ))}
              </ul>
            </section>
          )}

          <section className="mos-timeline" aria-label="Hour by hour">
            {schedule.hours.map(({ hour, tasks }) => (
              <div
                key={hour}
                className={`mos-slot${tasks.length === 0 ? ' is-empty' : ''}`}
              >
                <span className="mos-slot__hour">{formatHourLabel(hour)}</span>

                <div className="mos-slot__body">
                  {marker?.hour === hour && (
                    <span
                      className="mos-slot__now"
                      style={{ top: `${marker.fraction * 100}%` }}
                      aria-label="Current time"
                    />
                  )}

                  {tasks.length === 0 ? (
                    <button
                      type="button"
                      className="mos-slot__add"
                      aria-label={`Schedule a task at ${formatHourLabel(hour)}`}
                      onClick={() => onScheduleAt(hour)}
                    >
                      <PlusIcon />
                    </button>
                  ) : (
                    <ul className="mos-tasks">
                      {tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          lists={state.lists}
                          query=""
                          showTime
                          showListTag
                          onToggle={onToggleTask}
                          onOpen={onOpenTask}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </section>

          <p className="mos-note">
            {schedule.timedCount === 0
              ? 'Nothing is time-blocked yet. Tap an hour to drop a task into it.'
              : `${schedule.timedCount} time-blocked, first at ${formatPlanTime(
                  schedule.hours.find((slot) => slot.tasks.length > 0)?.tasks[0]
                    .time ?? null,
                )}.`}
          </p>

          <button type="button" className="mos-ghost-btn" onClick={onPlanFromLists}>
            <PlusIcon />
            Add from lists
          </button>
        </>
      )}
    </div>
  )
}
