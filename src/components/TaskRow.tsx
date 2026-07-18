import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { ContextList, PlaylistId, Task } from '../lib/types'
import { HighlightedText } from './HighlightedText'
import { ListTag } from './ListTag'

type Props = {
  task: Task
  lists: ContextList[]
  query: string
  draggable?: boolean
  dragData?: { from: PlaylistId | 'list'; taskId?: string }
  showTime?: boolean
  playlistId?: PlaylistId
  sortableId?: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onListChange: (id: string, listId: string) => void
  onTimeChange?: (id: string, time: string | null) => void
  onRemoveFromPlaylist?: (id: string, playlistId: PlaylistId) => void
  onAddToPlaylist?: (id: string, playlistId: PlaylistId) => void
}

export function TaskRow({
  task,
  lists,
  query,
  draggable = false,
  dragData,
  showTime = false,
  playlistId,
  sortableId,
  onToggle,
  onDelete,
  onListChange,
  onTimeChange,
  onRemoveFromPlaylist,
  onAddToPlaylist,
}: Props) {
  const sortable = useSortable({
    id: sortableId ?? task.id,
    data: dragData ?? { from: 'list' as const, taskId: task.id },
    disabled: !draggable,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.55 : 1,
    zIndex: sortable.isDragging ? 20 : undefined,
  }

  return (
    <article
      ref={sortable.setNodeRef}
      style={style}
      className={[
        'task',
        task.completed ? 'is-done' : '',
        task.overdue && !task.completed ? 'is-overdue' : '',
        sortable.isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...(draggable ? sortable.attributes : {})}
    >
      {draggable && (
        <button
          type="button"
          className="task__handle"
          aria-label="Drag to reorder"
          {...sortable.listeners}
        >
          <span />
          <span />
          <span />
        </button>
      )}

      <button
        type="button"
        className="task__check"
        aria-label={task.completed ? 'Mark incomplete' : 'Complete task'}
        aria-pressed={task.completed}
        onClick={() => onToggle(task.id)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
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
          onChange={(e) =>
            onTimeChange?.(task.id, e.target.value || null)
          }
          aria-label="Optional time"
        />
      )}

      <div className="task__body">
        <p className="task__text">
          <HighlightedText text={task.text} query={query} />
          {task.overdue && !task.completed && (
            <span className="task__overdue">overdue</span>
          )}
        </p>
        <div className="task__meta">
          <ListTag
            lists={lists}
            listId={task.listId}
            onChange={(listId) => onListChange(task.id, listId)}
          />
          {!playlistId && onAddToPlaylist && (
            <div className="task__quick">
              <button
                type="button"
                title="Add to Today"
                onClick={() => onAddToPlaylist(task.id, 'today')}
              >
                Today
              </button>
              <button
                type="button"
                title="Add to Tomorrow"
                onClick={() => onAddToPlaylist(task.id, 'tomorrow')}
              >
                Tmrw
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="task__actions">
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
          title="Delete task"
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
    </article>
  )
}
