import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { AppState, PlaylistId, Task } from '../lib/types'
import { EmptyState } from './EmptyState'
import { HighlightedText } from './HighlightedText'
import { ListTag } from './ListTag'

type Props = {
  state: AppState
  query: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onListChange: (id: string, listId: string) => void
  onAddToPlaylist: (id: string, playlistId: PlaylistId) => void
  onToggleCollapsed: (listId: string) => void
}

export function ContextLists({
  state,
  query,
  onToggle,
  onDelete,
  onListChange,
  onAddToPlaylist,
  onToggleCollapsed,
}: Props) {
  return (
    <div className="context-lists">
      {state.lists.map((list) => {
        const tasks = Object.values(state.tasks)
          .filter((t) => t.listId === list.id)
          .filter((t) => matchesQuery(t, query))
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1
            return b.createdAt - a.createdAt
          })

        return (
          <section
            key={list.id}
            className={`panel list ${list.collapsed ? 'is-collapsed' : ''}`}
          >
            <header className="panel__head">
              <button
                type="button"
                className="panel__toggle"
                onClick={() => onToggleCollapsed(list.id)}
                aria-expanded={!list.collapsed}
              >
                <span className="chev" aria-hidden>
                  {list.collapsed ? '▸' : '▾'}
                </span>
                <div>
                  <h2>
                    <span
                      className="list-dot"
                      style={{ background: list.color }}
                    />
                    {list.name}
                  </h2>
                  <p>Context list · single source of truth</p>
                </div>
              </button>
              <span className="panel__count">{tasks.length}</span>
            </header>

            {!list.collapsed && (
              <div className="panel__body">
                {tasks.length === 0 ? (
                  <EmptyState
                    title={`No ${list.name.toLowerCase()} yet`}
                    body={
                      list.id === 'inbox'
                        ? 'Unsorted captures land here. Re-tag in one click.'
                        : 'Capture something that matches this context, or retag from Inbox.'
                    }
                  />
                ) : (
                  <div className="task-stack">
                    {tasks.map((task) => (
                      <DraggableListTask
                        key={task.id}
                        task={task}
                        query={query}
                        lists={state.lists}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onListChange={onListChange}
                        onAddToPlaylist={onAddToPlaylist}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function DraggableListTask({
  task,
  query,
  lists,
  onToggle,
  onDelete,
  onListChange,
  onAddToPlaylist,
}: {
  task: Task
  query: string
  lists: AppState['lists']
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onListChange: (id: string, listId: string) => void
  onAddToPlaylist: (id: string, playlistId: PlaylistId) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `list-${task.id}`,
      data: { from: 'list' as const, taskId: task.id },
    })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={[
        'task',
        task.completed ? 'is-done' : '',
        task.overdue && !task.completed ? 'is-overdue' : '',
        isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="task__handle"
        aria-label="Drag into Today or Tomorrow"
        {...listeners}
        {...attributes}
      >
        <span />
        <span />
        <span />
      </button>

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

      <div className="task__body">
        <p className="task__text">
          <HighlightedText text={task.text} query={query} />
        </p>
        <div className="task__meta">
          <ListTag
            lists={lists}
            listId={task.listId}
            onChange={(listId) => onListChange(task.id, listId)}
          />
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
        </div>
      </div>

      <div className="task__actions">
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

function matchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return task.text.toLowerCase().includes(q)
}
