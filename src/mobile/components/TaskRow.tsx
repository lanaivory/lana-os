import type { CSSProperties } from 'react'
import { HighlightedText } from '../../components/HighlightedText'
import { taskShowsNew } from '../../lib/taskNew'
import { formatPlanTime } from '../../lib/timeFormat'
import type { ContextList, Task } from '../../lib/types'
import { displayTextWithoutUrl, extractUrl } from '../../lib/urls'
import { CheckIcon, LinkIcon } from './icons'

type Props = {
  task: Task
  lists: ContextList[]
  query?: string
  /**
   * The list this surface is already about. A row only names its list when it
   * differs, so a list's own rows stay quiet.
   */
  contextListId?: string | null
  /** Search results also say which day the task is planned into. */
  dayLabel?: string | null
  onToggle: (taskId: string) => void
  onOpen: (taskId: string) => void
}

/**
 * One scannable line: checkbox, the time in a box on the left when there is
 * one, the title, and the owning list named plainly at the end.
 */
export function TaskRow({
  task,
  lists,
  query = '',
  contextListId = null,
  dayLabel = null,
  onToggle,
  onOpen,
}: Props) {
  const url = extractUrl(task.text)
  const title = url ? displayTextWithoutUrl(task.text) : task.text
  const time = formatPlanTime(task.time)
  const list =
    task.listId === contextListId
      ? undefined
      : lists.find((l) => l.id === task.listId)

  return (
    <li
      className={[
        'mos-task',
        task.completed ? 'is-done' : '',
        task.overdue && !task.completed ? 'is-overdue' : '',
        taskShowsNew(task) ? 'is-new' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-mos-task={task.id}
    >
      <button
        type="button"
        className="mos-task__check"
        aria-pressed={task.completed}
        aria-label={task.completed ? 'Mark incomplete' : 'Complete task'}
        onClick={() => onToggle(task.id)}
      >
        <CheckIcon />
      </button>

      {time && <span className="mos-time-box">{time}</span>}

      <button
        type="button"
        className="mos-task__body"
        onClick={() => onOpen(task.id)}
        aria-label={`Edit ${task.text}`}
      >
        <span className="mos-task__title">
          {title ? <HighlightedText text={title} query={query} /> : url}
        </span>
        {(dayLabel || list) && (
          <span className="mos-task__trailing">
            {dayLabel && <span className="mos-task__day">{dayLabel}</span>}
            {list && (
              <span
                className="mos-task__list"
                style={{ '--tag': list.color } as CSSProperties}
              >
                {list.name}
              </span>
            )}
          </span>
        )}
      </button>

      {url && (
        <a
          className="mos-task__link"
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open link"
          onClick={(event) => event.stopPropagation()}
        >
          <LinkIcon />
        </a>
      )}
    </li>
  )
}
