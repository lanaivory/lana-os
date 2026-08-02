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
  query: string
  /** Rows on a dated surface show the planned time; list rows do not. */
  showTime?: boolean
  /** Rows outside a single list name the owning context list. */
  showListTag?: boolean
  /** Search results also name the day the task is planned into. */
  dayTag?: string | null
  onToggle: (taskId: string) => void
  onOpen: (taskId: string) => void
}

export function TaskRow({
  task,
  lists,
  query,
  showTime = false,
  showListTag = false,
  dayTag = null,
  onToggle,
  onOpen,
}: Props) {
  const url = extractUrl(task.text)
  const title = url ? displayTextWithoutUrl(task.text) : task.text
  const time = showTime ? formatPlanTime(task.time) : null
  const list = showListTag ? lists.find((l) => l.id === task.listId) : undefined

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

      <button
        type="button"
        className="mos-task__body"
        onClick={() => onOpen(task.id)}
        aria-label={`Open actions for ${task.text}`}
      >
        <span className="mos-task__title">
          {title ? <HighlightedText text={title} query={query} /> : url}
        </span>
        {(time || list || dayTag) && (
          <span className="mos-task__meta">
            {time && <span className="mos-task__time">{time}</span>}
            {dayTag && <span className="mos-task__day">{dayTag}</span>}
            {list && (
              <span
                className="mos-task__tag"
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
