import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import type { ContextList, Task } from '../lib/types'
import { extractUrl } from '../lib/urls'
import { HighlightedText } from './HighlightedText'
import { ListTag } from './ListTag'

export type TaskDragData = {
  type: 'task'
  taskId: string
  from: 'playlist' | 'list'
  containerId: string
}

type Props = {
  task: Task
  lists: ContextList[]
  query: string
  containerId: string
  from: 'playlist' | 'list'
  sortableId: string
  /** Playlist compact row: time · title · list tag on one line */
  compact?: boolean
  showTime?: boolean
  showListTag?: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onTimeChange?: (id: string, time: string | null) => void
  onListChange: (id: string, listId: string) => void
  onClearNew: (id: string) => void
  insertBefore?: boolean
}

export function TaskRow({
  task,
  lists,
  query,
  containerId,
  from,
  sortableId,
  compact = false,
  showTime = false,
  showListTag = true,
  onToggle,
  onDelete,
  onTimeChange,
  onListChange,
  onClearNew,
  insertBefore = false,
}: Props) {
  const dragData: TaskDragData = {
    type: 'task',
    taskId: task.id,
    from,
    containerId,
  }

  const sortable = useSortable({
    id: sortableId,
    data: dragData,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.35 : 1,
    zIndex: sortable.isDragging ? 20 : undefined,
  }

  const url = extractUrl(task.text)

  // Desktop: keep whole-row mouse drag. Touch listeners stay on the handle only
  // so swipes scroll the board instead of grabbing the task.
  const onRowMouseDown = sortable.listeners?.onMouseDown as
    | ((event: ReactMouseEvent) => void)
    | undefined

  return (
    <>
      {insertBefore && <div className="insert-line insert-line--horizontal" />}
      <article
        ref={sortable.setNodeRef}
        style={style}
        data-task-id={task.id}
        className={[
          'task',
          compact ? 'task--compact' : '',
          task.completed ? 'is-done' : '',
          task.overdue && !task.completed ? 'is-overdue' : '',
          task.isNew ? 'is-new' : '',
          sortable.isDragging ? 'is-dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onMouseDown={onRowMouseDown}
      >
        <div className="task__row">
          <button
            ref={sortable.setActivatorNodeRef}
            type="button"
            className="task__drag"
            data-drag-handle
            title="Drag task"
            aria-label="Drag task"
            {...sortable.attributes}
            {...sortable.listeners}
            onMouseDown={(e) => {
              onRowMouseDown?.(e)
              e.stopPropagation()
            }}
          >
            <svg viewBox="0 0 10 16" width="8" height="14" aria-hidden>
              <circle cx="3" cy="3" r="1.35" fill="currentColor" />
              <circle cx="7" cy="3" r="1.35" fill="currentColor" />
              <circle cx="3" cy="8" r="1.35" fill="currentColor" />
              <circle cx="7" cy="8" r="1.35" fill="currentColor" />
              <circle cx="3" cy="13" r="1.35" fill="currentColor" />
              <circle cx="7" cy="13" r="1.35" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            className="task__check"
            aria-label={task.completed ? 'Mark incomplete' : 'Complete task'}
            aria-pressed={task.completed}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(task.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
              <path
                d="M3.5 8.2l2.8 2.8 6.2-6.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showTime && (
            <TimeChip
              value={task.time ?? ''}
              onChange={(time) => onTimeChange?.(task.id, time)}
            />
          )}

          <div className="task__main">
            <p className="task__text">
              <HighlightedText text={task.text} query={query} />
              {task.isNew && <span className="badge badge--new">NEW</span>}
              {task.overdue && !task.completed && (
                <span className="badge badge--overdue">OVERDUE</span>
              )}
            </p>
          </div>

          {showListTag && (
            <ListTag
              lists={lists}
              listId={task.listId}
              onChange={(listId) => onListChange(task.id, listId)}
              onOpen={() => onClearNew(task.id)}
            />
          )}

          {url && (
            <a
              className="task__link"
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Open link"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
                <path
                  d="M6.2 9.8a2.6 2.6 0 0 1 0-3.7l1.4-1.4a2.6 2.6 0 1 1 3.7 3.7L10.5 9.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.55"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.8 6.2a2.6 2.6 0 0 1 0 3.7L8.4 11.3a2.6 2.6 0 1 1-3.7-3.7L5.5 6.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.55"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          )}

          <div
            className="task__actions"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ghost danger"
              title="Delete"
              aria-label="Delete task"
              onClick={() => onDelete(task.id)}
            >
              ✕
            </button>
          </div>
        </div>
      </article>
    </>
  )
}

function formatCompactTime(value: string): string {
  if (!value) return '–'
  const [hs, ms] = value.split(':')
  const h = Number(hs)
  const m = Number(ms)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '–'
  const suffix = h < 12 ? 'a' : 'p'
  const h12 = h % 12 || 12
  // On-the-hour → "7a"; otherwise "7:45a" — keeps the mobile chip narrow.
  if (m === 0) return `${h12}${suffix}`
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

function TimeChip({
  value,
  onChange,
}: {
  value: string
  onChange: (time: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // showPicker can throw if not triggered by a user gesture in some browsers
    }
    input.focus()
    input.click()
  }

  return (
    <div className="task__time-wrap">
      <button
        type="button"
        className="task__time-pill"
        onClick={(e) => {
          e.stopPropagation()
          openPicker()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={value ? `Time ${formatCompactTime(value)}` : 'Set time'}
      >
        {formatCompactTime(value)}
      </button>
      <input
        ref={inputRef}
        type="time"
        className="task__time"
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        aria-label="Optional time"
      />
    </div>
  )
}
