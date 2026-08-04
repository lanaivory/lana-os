import type { CSSProperties } from 'react'
import type { useSortable } from '@dnd-kit/sortable'
import { HighlightedText } from '../../components/HighlightedText'
import type { ContextList, Task } from '../../lib/types'
import { displayTextWithoutUrl, extractUrl } from '../../lib/urls'
import { useRowSwipe } from '../hooks/useRowSwipe'
import { TimeBox } from './TimeBox'
import { CheckIcon, LinkIcon } from './icons'

/** Room for the two labels a left swipe uncovers. */
const ACTIONS_WIDTH_PX = 142

/** What a row can be swiped into doing. Omit to leave the row inert. */
export type TaskRowActions = {
  onComplete: (taskId: string) => void
  onMove: (taskId: string) => void
  onDelete: (taskId: string) => void
  /** The row whose actions are open, so only ever one of them is. */
  openId: string | null
  onOpenChange: (taskId: string | null) => void
}

/** Wired on surfaces where a row can be held and dragged into a new order. */
export type TaskRowSortable = Pick<
  ReturnType<typeof useSortable>,
  'listeners' | 'setNodeRef' | 'transform' | 'transition' | 'isDragging'
>

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
  /** On the Playlist every row shows the time, so the left edge lines up. */
  alwaysShowTime?: boolean
  actions?: TaskRowActions
  sortable?: TaskRowSortable
  onToggle: (taskId: string) => void
  onOpen: (taskId: string) => void
  /** Present where the time can be set from the row itself. */
  onTimeChange?: (taskId: string, time: string | null) => void
}

/**
 * One scannable line: checkbox, the time on the left, the title, and the owning
 * list named plainly at the end. The row carries no card of its own — a
 * hairline is all that stands between it and the next one.
 *
 * The line itself sits in a slide, so a swipe can move it aside and uncover
 * what the row can do: right to complete it, left for Move and Delete.
 */
export function TaskRow({
  task,
  lists,
  query = '',
  contextListId = null,
  dayLabel = null,
  alwaysShowTime = false,
  actions,
  sortable,
  onToggle,
  onOpen,
  onTimeChange,
}: Props) {
  const url = extractUrl(task.text)
  const title = url ? displayTextWithoutUrl(task.text) : task.text
  const list =
    task.listId === contextListId
      ? undefined
      : lists.find((l) => l.id === task.listId)
  const showTime = alwaysShowTime || Boolean(task.time)

  const open = actions?.openId === task.id
  const swipe = useRowSwipe({
    onComplete: () => actions?.onComplete(task.id),
    open,
    onOpenChange: (next) => actions?.onOpenChange(next ? task.id : null),
    openPx: ACTIONS_WIDTH_PX,
    disabled: !actions || sortable?.isDragging,
  })

  const className = [
    'mos-task',
    task.completed ? 'is-done' : '',
    actions ? 'can-swipe' : '',
    open ? 'is-open' : '',
    swipe.swiping ? 'is-swiping' : '',
    sortable?.isDragging ? 'is-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style = {
    '--slide': `${swipe.offset}px`,
    transform: sortable?.transform
      ? `translate3d(0, ${sortable.transform.y}px, 0)`
      : undefined,
    transition: sortable?.transition,
  } as CSSProperties

  return (
    <li
      ref={sortable?.setNodeRef}
      className={className}
      style={style}
      data-mos-task={task.id}
      {...sortable?.listeners}
    >
      {actions && (
        <>
          <span
            className={`mos-task__reveal mos-task__reveal--complete${
              swipe.armed === 'complete' ? ' is-armed' : ''
            }`}
            aria-hidden
          >
            <CheckIcon />
            {task.completed ? 'Undo' : 'Done'}
          </span>

          <div className="mos-task__actions">
            <button
              type="button"
              className="mos-task__action"
              tabIndex={open ? undefined : -1}
              onClick={() => actions.onMove(task.id)}
            >
              Move
            </button>
            <button
              type="button"
              className="mos-task__action mos-task__action--danger"
              tabIndex={open ? undefined : -1}
              onClick={() => actions.onDelete(task.id)}
            >
              Delete
            </button>
          </div>
        </>
      )}

      <div className="mos-task__slide" {...swipe.handlers}>
        <button
          type="button"
          className="mos-task__check"
          aria-pressed={task.completed}
          aria-label={task.completed ? 'Mark incomplete' : 'Complete task'}
          onClick={() => onToggle(task.id)}
        >
          <CheckIcon />
        </button>

        {showTime && (
          <TimeBox
            time={task.time}
            hold={alwaysShowTime}
            label={`Time for ${task.text}`}
            onChange={
              onTimeChange ? (next) => onTimeChange(task.id, next) : undefined
            }
          />
        )}

        <button
          type="button"
          className="mos-task__body"
          onClick={() => {
            if (swipe.consumedTap()) return
            // An open row puts itself away first; you asked for the actions.
            if (open) {
              actions?.onOpenChange(null)
              return
            }
            onOpen(task.id)
          }}
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
      </div>
    </li>
  )
}
