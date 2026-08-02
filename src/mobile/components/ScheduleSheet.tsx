import { formatHourLabel, hourTimeValue } from '../../lib/calendar'
import type { Task } from '../../lib/types'
import { Sheet } from './Sheet'
import { ClockIcon } from './icons'

type Props = {
  /** The hour tapped on the calendar, or null when the sheet is closed. */
  hour: number | null
  /** Tasks planned into the day that have no time yet. */
  tasks: Task[]
  onClose: () => void
  onSchedule: (taskId: string, time: string) => void
}

/** Drop one of the day's untimed tasks into the hour tapped on the calendar. */
export function ScheduleSheet({ hour, tasks, onClose, onSchedule }: Props) {
  if (hour === null) return null

  return (
    <Sheet
      open
      title={`Schedule at ${formatHourLabel(hour)}`}
      onClose={onClose}
      layer="stacked"
    >
      {tasks.length === 0 ? (
        <p className="mos-sheet__message">
          Everything planned for this day already has a time.
        </p>
      ) : (
        <ul className="mos-pick">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="mos-pick__item"
                onClick={() => onSchedule(task.id, hourTimeValue(hour))}
              >
                <span className="mos-pick__text">{task.text}</span>
                <ClockIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
