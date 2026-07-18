import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { ContextList, PlaylistId, Task } from '../lib/types'
import { extractUrl } from '../lib/urls'
import { HighlightedText } from './HighlightedText'

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
  showTime?: boolean
  showSource?: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onTimeChange?: (id: string, time: string | null) => void
  onRemoveFromPlaylist?: (id: string, playlistId: PlaylistId) => void
  playlistId?: PlaylistId
  insertBefore?: boolean
}

export function TaskRow({
  task,
  lists,
  query,
  containerId,
  from,
  sortableId,
  showTime = false,
  showSource = true,
  onToggle,
  onDelete,
  onTimeChange,
  onRemoveFromPlaylist,
  playlistId,
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

  const source = lists.find((l) => l.id === task.listId)
  const url = extractUrl(task.text)

  return (
    <>
      {insertBefore && <div className="insert-line insert-line--horizontal" />}
      <article
        ref={sortable.setNodeRef}
        style={style}
        className={[
          'task',
          showTime ? 'task--timed' : '',
          task.completed ? 'is-done' : '',
          task.overdue && !task.completed ? 'is-overdue' : '',
          sortable.isDragging ? 'is-dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <div className="task__row">
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
            <input
              type="time"
              className="task__time"
              value={task.time ?? ''}
              onChange={(e) => onTimeChange?.(task.id, e.target.value || null)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Optional time"
            />
          )}

          <div className="task__content">
            <p className="task__text">
              <HighlightedText text={task.text} query={query} />
            </p>
            <div className="task__meta">
              {showSource && source && (
                <span className="task__source">({source.name})</span>
              )}
              {task.overdue && !task.completed && (
                <span className="badge badge--overdue">OVERDUE</span>
              )}
            </div>
          </div>

          {url && (
            <a
              className="task__link"
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Open link"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
                <path
                  d="M6.5 9.5l3-3M7 4.5h.8a3.2 3.2 0 0 1 0 6.4H7M9 11.5h-.8a3.2 3.2 0 0 1 0-6.4H9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </a>
          )}

          <div
            className="task__actions"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {playlistId && onRemoveFromPlaylist && (
              <button
                type="button"
                className="ghost"
                title="Remove from playlist"
                onClick={() => onRemoveFromPlaylist(task.id, playlistId)}
              >
                ✕
              </button>
            )}
            <button
              type="button"
              className="ghost danger"
              title="Delete"
              onClick={() => onDelete(task.id)}
            >
              Del
            </button>
          </div>
        </div>
      </article>
    </>
  )
}
