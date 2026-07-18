import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { AppState, PlaylistId, Task } from '../lib/types'
import { AddTaskRow } from './AddTaskRow'
import { TaskRow } from './TaskRow'

type ContextCardProps = {
  listId: string
  state: AppState
  query: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onToggleCollapsed: (listId: string) => void
  onAddTask: (listId: string, text: string) => void
}

export function ContextListCard({
  listId,
  state,
  query,
  onToggle,
  onDelete,
  onToggleCollapsed,
  onAddTask,
}: ContextCardProps) {
  const list = state.lists.find((l) => l.id === listId)
  if (!list) return null

  const tasks = Object.values(state.tasks)
    .filter((t) => t.listId === list.id)
    .filter((t) => matchesQuery(t, query))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return b.createdAt - a.createdAt
    })

  return (
    <section
      className={`card ${list.collapsed ? 'is-collapsed' : ''}`}
      style={{ '--accent': list.color } as CSSProperties}
    >
      <header className="card__head">
        <button
          type="button"
          className="card__toggle"
          onClick={() => onToggleCollapsed(list.id)}
          aria-expanded={!list.collapsed}
        >
          <span className="chev">{list.collapsed ? '▸' : '▾'}</span>
          <span className="card__dot" />
          <h2>{list.name}</h2>
        </button>
        <span className="card__count">{tasks.length}</span>
      </header>

      {!list.collapsed && (
        <>
          <div className="card__body">
            {tasks.length === 0 ? (
              <p className="card__empty">No tasks yet</p>
            ) : (
              <div className="task-stack">
                {tasks.map((task) => (
                  <DraggableContextTask
                    key={task.id}
                    task={task}
                    lists={state.lists}
                    query={query}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
          <AddTaskRow onAdd={(text) => onAddTask(list.id, text)} />
        </>
      )}
    </section>
  )
}

function DraggableContextTask({
  task,
  lists,
  query,
  onToggle,
  onDelete,
}: {
  task: Task
  lists: AppState['lists']
  query: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `list-${task.id}`,
      data: { from: 'list' as const, taskId: task.id },
    })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskRow
        task={task}
        lists={lists}
        query={query}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    </div>
  )
}

type PlaylistCardProps = {
  playlistId: PlaylistId
  state: AppState
  query: string
  featured?: boolean
  liveClock?: string
  liveDate?: string
  sortByTime?: boolean
  onSortByTimeChange?: (value: boolean) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onTimeChange: (id: string, time: string | null) => void
  onRemoveFromPlaylist: (id: string, playlistId: PlaylistId) => void
  onToggleCollapsed: (playlistId: PlaylistId) => void
  onAddTask: (playlistId: PlaylistId, text: string) => void
}

export function PlaylistCard({
  playlistId,
  state,
  query,
  featured = false,
  liveClock,
  liveDate,
  sortByTime = false,
  onSortByTimeChange,
  onToggle,
  onDelete,
  onTimeChange,
  onRemoveFromPlaylist,
  onToggleCollapsed,
  onAddTask,
}: PlaylistCardProps) {
  const collapsed = state.collapsedPlaylists[playlistId]
  const ids = state.playlists[playlistId]
  let tasks = ids
    .map((id) => state.tasks[id])
    .filter((t): t is Task => Boolean(t))
    .filter((t) => matchesQuery(t, query))

  if (sortByTime && playlistId === 'today') {
    tasks = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  }

  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${playlistId}`,
    data: { playlistId },
  })

  const title =
    playlistId === 'today'
      ? 'Today'
      : playlistId === 'tomorrow'
        ? 'Tomorrow'
        : 'This Week'

  const showTime = playlistId === 'today' || playlistId === 'tomorrow'

  return (
    <section
      ref={setNodeRef}
      className={[
        'card',
        'card--playlist',
        featured ? 'card--today' : '',
        collapsed ? 'is-collapsed' : '',
        isOver ? 'is-over' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="card__head">
        <button
          type="button"
          className="card__toggle"
          onClick={() => onToggleCollapsed(playlistId)}
          aria-expanded={!collapsed}
        >
          <span className="chev">{collapsed ? '▸' : '▾'}</span>
          <h2>{title}</h2>
        </button>
        <span className="card__count">{tasks.length}</span>
      </header>

      {featured && !collapsed && (
        <div className="card__today-meta">
          <div>
            <p className="card__clock">{liveClock}</p>
            <p className="card__date">{liveDate}</p>
          </div>
          <label className="sort-toggle">
            <input
              type="checkbox"
              checked={sortByTime}
              onChange={(e) => onSortByTimeChange?.(e.target.checked)}
            />
            <span>Sort by time</span>
          </label>
        </div>
      )}

      {!collapsed && (
        <>
          <div className="card__body">
            {tasks.length === 0 ? (
              <p className="card__empty">drag tasks here to plan</p>
            ) : (
              <SortableContext
                items={tasks.map((t) => `${playlistId}:${t.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="task-stack">
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      lists={state.lists}
                      query={query}
                      draggable
                      sortableId={`${playlistId}:${task.id}`}
                      dragData={{ from: playlistId, taskId: task.id }}
                      showTime={showTime}
                      playlistId={playlistId}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onTimeChange={onTimeChange}
                      onRemoveFromPlaylist={onRemoveFromPlaylist}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
          <AddTaskRow onAdd={(text) => onAddTask(playlistId, text)} />
        </>
      )}
    </section>
  )
}

function matchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return task.text.toLowerCase().includes(q)
}
