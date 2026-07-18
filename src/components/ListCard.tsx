import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties, ReactNode } from 'react'
import {
  isPlaylistId,
  orderedListTasks,
  type BoardCardId,
} from '../lib/board'
import type { AppState, PlaylistId, Task } from '../lib/types'
import { AddTaskRow } from './AddTaskRow'
import { DragHandle } from './DragHandle'
import { ResizeHandle } from './ResizeHandle'
import { TaskRow } from './TaskRow'
import { WidthResizeHandle } from './WidthResizeHandle'

export type CardDragData = {
  type: 'card'
  cardId: BoardCardId
}

type SharedProps = {
  state: AppState
  query: string
  cardId: string
  insertBefore?: boolean
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onResizeHeight: (cardId: string, height: number | null) => void
  taskInsertIndex?: number | null
}

type ContextProps = SharedProps & {
  listId: string
  onToggleCollapsed: (listId: string) => void
  onAddTask: (listId: string, text: string) => void
}

export function ContextListCard({
  listId,
  state,
  query,
  cardId,
  insertBefore,
  onToggle,
  onDelete,
  onToggleCollapsed,
  onAddTask,
  onResizeHeight,
  taskInsertIndex = null,
}: ContextProps) {
  const list = state.lists.find((l) => l.id === listId)
  if (!list) return null

  const taskIds = orderedListTasks(state, list.id, { hidePlanned: true }).filter(
    (id) => {
      const t = state.tasks[id]
      if (!t) return false
      const q = query.trim().toLowerCase()
      if (!q) return true
      return t.text.toLowerCase().includes(q)
    },
  )
  const tasks = taskIds
    .map((id) => state.tasks[id])
    .filter((t): t is Task => Boolean(t))

  return (
    <SortableCardShell
      cardId={cardId}
      insertBefore={insertBefore}
      height={state.cardHeights[cardId]}
      onResizeHeight={onResizeHeight}
      className={list.collapsed ? 'is-collapsed' : ''}
      style={{ '--accent': list.color } as CSSProperties}
      title={
        <>
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
        </>
      }
    >
      {!list.collapsed && (
        <>
          <TaskDropBody
            containerId={`list:${list.id}`}
            height={state.cardHeights[cardId]}
          >
            {tasks.length === 0 ? (
              <p className="card__empty">No tasks yet</p>
            ) : (
              <SortableContext
                items={tasks.map((t) => `task:list:${list.id}:${t.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="task-stack">
                  {tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      lists={state.lists}
                      query={query}
                      containerId={list.id}
                      from="list"
                      sortableId={`task:list:${list.id}:${task.id}`}
                      showSource={false}
                      insertBefore={taskInsertIndex === index}
                      onToggle={onToggle}
                      onDelete={onDelete}
                    />
                  ))}
                  {taskInsertIndex === tasks.length && (
                    <div className="insert-line insert-line--horizontal" />
                  )}
                </div>
              </SortableContext>
            )}
          </TaskDropBody>
          <AddTaskRow onAdd={(text) => onAddTask(list.id, text)} />
        </>
      )}
    </SortableCardShell>
  )
}

type PlaylistProps = SharedProps & {
  playlistId: PlaylistId
  featured?: boolean
  liveClock?: string
  liveDate?: string
  sortByTime?: boolean
  onSortByTimeChange?: (value: boolean) => void
  onTimeChange: (id: string, time: string | null) => void
  onRemoveFromPlaylist: (id: string, playlistId: PlaylistId) => void
  onToggleCollapsed: (playlistId: PlaylistId) => void
  onAddTask: (playlistId: PlaylistId, text: string) => void
  onResizeWidth: (cardId: string, width: number | null) => void
}

export function PlaylistCard({
  playlistId,
  state,
  query,
  cardId,
  insertBefore,
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
  onResizeHeight,
  onResizeWidth,
  taskInsertIndex = null,
}: PlaylistProps) {
  const collapsed = state.collapsedPlaylists[playlistId]
  const ids = state.playlists[playlistId]
  let tasks = ids
    .map((id) => state.tasks[id])
    .filter((t): t is Task => Boolean(t))
    .filter((t) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return t.text.toLowerCase().includes(q)
    })

  if (sortByTime && playlistId === 'today') {
    tasks = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })
  }

  const title =
    playlistId === 'today'
      ? 'Today'
      : playlistId === 'tomorrow'
        ? 'Tomorrow'
        : 'This Week'

  const showTime = playlistId === 'today' || playlistId === 'tomorrow'
  const width = state.cardWidths[cardId]

  return (
    <SortableCardShell
      cardId={cardId}
      insertBefore={insertBefore}
      height={state.cardHeights[cardId]}
      width={width}
      onResizeHeight={onResizeHeight}
      onResizeWidth={onResizeWidth}
      enableWidthResize
      className={[
        'card--playlist',
        featured ? 'card--today' : '',
        collapsed ? 'is-collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={
        <>
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
        </>
      }
    >
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
          <TaskDropBody
            containerId={`playlist:${playlistId}`}
            height={state.cardHeights[cardId]}
            playlistId={playlistId}
          >
            {tasks.length === 0 ? (
              <p className="card__empty">drag tasks here to plan</p>
            ) : (
              <SortableContext
                items={tasks.map((t) => `task:playlist:${playlistId}:${t.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="task-stack task-stack--compact">
                  {tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      lists={state.lists}
                      query={query}
                      containerId={playlistId}
                      from="playlist"
                      sortableId={`task:playlist:${playlistId}:${task.id}`}
                      compact
                      showTime={showTime}
                      showSource
                      playlistId={playlistId}
                      insertBefore={taskInsertIndex === index}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onTimeChange={onTimeChange}
                      onRemoveFromPlaylist={onRemoveFromPlaylist}
                    />
                  ))}
                  {taskInsertIndex === tasks.length && (
                    <div className="insert-line insert-line--horizontal" />
                  )}
                </div>
              </SortableContext>
            )}
          </TaskDropBody>
          <AddTaskRow onAdd={(text) => onAddTask(playlistId, text)} />
        </>
      )}
    </SortableCardShell>
  )
}

function SortableCardShell({
  cardId,
  title,
  children,
  className = '',
  style,
  height,
  width,
  onResizeHeight,
  onResizeWidth,
  enableWidthResize = false,
  insertBefore,
}: {
  cardId: string
  title: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
  height?: number
  width?: number
  onResizeHeight: (cardId: string, height: number | null) => void
  onResizeWidth?: (cardId: string, width: number | null) => void
  enableWidthResize?: boolean
  insertBefore?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `card:${cardId}`,
      data: { type: 'card', cardId } satisfies CardDragData,
    })

  const cardStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    width: width ?? undefined,
    minWidth: width ?? undefined,
  }

  return (
    <>
      {insertBefore && <div className="insert-line insert-line--horizontal" />}
      <section
        ref={setNodeRef}
        style={cardStyle}
        className={`card ${className} ${isDragging ? 'is-dragging-card' : ''}`}
      >
        <header className="card__head">
          <DragHandle attributes={attributes} listeners={listeners} />
          {title}
        </header>
        {children}
        <ResizeHandle
          cardId={cardId}
          height={height}
          onResize={onResizeHeight}
        />
        {enableWidthResize && onResizeWidth && (
          <>
            <WidthResizeHandle
              cardId={cardId}
              edge="left"
              width={width}
              onResize={onResizeWidth}
            />
            <WidthResizeHandle
              cardId={cardId}
              edge="right"
              width={width}
              onResize={onResizeWidth}
            />
          </>
        )}
      </section>
    </>
  )
}

function TaskDropBody({
  containerId,
  height,
  playlistId,
  children,
}: {
  containerId: string
  height?: number
  playlistId?: PlaylistId
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tasks:${containerId}`,
    data: {
      type: 'task-container',
      containerId,
      playlistId,
      listId: containerId.startsWith('list:')
        ? containerId.slice(5)
        : undefined,
      isPlaylist: Boolean(playlistId) || containerId.startsWith('playlist:'),
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card__body card__scroll ${isOver ? 'is-task-over' : ''}`}
      style={height ? { height, maxHeight: height } : undefined}
    >
      {children}
    </div>
  )
}

export function renderCardIdIsPlaylist(cardId: string): cardId is PlaylistId {
  return isPlaylistId(cardId)
}
