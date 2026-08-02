import type { CSSProperties } from 'react'
import { daysUntil } from '../../lib/commitments'
import { formatPlanTime } from '../../lib/timeFormat'
import type { Commitment, ContextList } from '../../lib/types'
import { BellIcon, CheckIcon } from './icons'

type Props = {
  commitment: Commitment
  lists: ContextList[]
  todayKey: string
  /** Hidden on Today, where every row is already about today. */
  showDate?: boolean
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

function formatDate(dateKey: string, todayKey: string): string {
  const diff = daysUntil(dateKey, todayKey)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  const [year, month, day] = dateKey.split('-').map(Number)
  return DATE_FORMAT.format(new Date(year, month - 1, day))
}

/** A dated commitment, wearing the same anatomy as a task row. */
export function CommitmentRow({
  commitment,
  lists,
  todayKey,
  showDate = true,
  onToggle,
  onOpen,
}: Props) {
  const time = formatPlanTime(commitment.time)
  const list = lists.find((l) => l.id === commitment.listId)
  const overdue =
    !commitment.done && (daysUntil(commitment.date, todayKey) ?? 0) < 0

  return (
    <li
      className={[
        'mos-task',
        commitment.done ? 'is-done' : '',
        overdue ? 'is-overdue' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="mos-task__check"
        aria-pressed={commitment.done}
        aria-label={commitment.done ? 'Mark not done' : 'Mark done'}
        onClick={() => onToggle(commitment.id)}
      >
        <CheckIcon />
      </button>

      {time && <span className="mos-time-box">{time}</span>}

      <button
        type="button"
        className="mos-task__body"
        onClick={() => onOpen(commitment.id)}
        aria-label={`Edit ${commitment.title}`}
      >
        <span className="mos-task__title">{commitment.title}</span>
        <span className="mos-task__trailing">
          {commitment.reminderMinutesBefore !== null && (
            <span className="mos-task__bell" aria-label="Reminder set">
              <BellIcon />
            </span>
          )}
          {showDate && (
            <span className="mos-task__day">
              {formatDate(commitment.date, todayKey)}
            </span>
          )}
          {list && (
            <span
              className="mos-task__list"
              style={{ '--tag': list.color } as CSSProperties}
            >
              {list.name}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}
