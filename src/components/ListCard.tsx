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
import { sortTasksForListMode, type ListSortMode } from '../lib/listSort'
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
  onListChange: (id: string, listId: string) => void
  onClearNew: (id: string) => void
  onResizeHeight: (cardId: string, height: number | null) => void
  onToggleTaskTitleWrap: (taskId: string) => void
  taskInsertIndex?: number | null
}

type ContextProps = SharedProps & {
  listId: string
  onToggleCollapsed: (listId: string) => void
  onAddTask: (listId: string, text: string) => void
  onDeleteList: (listId: string) => void
  onResizeWidth: (cardId: string, width: number | null) => void
  /** Mobile: override persisted collapse (empty auto-collapse / force expand). */
  forceCollapsed?: boolean | null
  /** Mobile category sort — view-only except `custom` (drag order). */
  listSortMode?: ListSortMode
  /**
   * Mobile stack: hide resize chrome, enable long-press header drag to
   * reorder whole lists.
   */
  chromeLite?: boolean
}

export function ContextListCard({
  listId,
  state,
  query,
  cardId,
  insertBefore,
  onToggle,
  onDelete,
  onListChange,
  onClearNew,
  onToggleCollapsed,
  onAddTask,
  onDeleteList,
  onResizeHeight,
  onResizeWidth,
  onToggleTaskTitleWrap,
  taskInsertIndex = null,
  forceCollapsed = null,
  listSortMode = 'custom',
  chromeLite = false,
}: ContextProps) {
  const list = state.lists.find((l) => l.id === listId)
  if (!list) return null

  const q = query.trim().toLowerCase()
  const taskIds = orderedListTasks(state, list.id, { hidePlanned: true })
  const baseTasks = taskIds
    .map((id) => state.tasks[id])
    .filter((t): t is Task => Boolean(t))
  const sorted = sortTasksForListMode(baseTasks, listSortMode)
  // Live filter when searching from the Lists toolbar.
  const tasks = q
    ? sorted.filter((t) => t.text.toLowerCase().includes(q))
    : sorted
  const width = state.cardWidths[cardId]
  const collapsed =
    forceCollapsed === null ? list.collapsed : forceCollapsed
  const dragEnabled = listSortMode === 'custom'
  const visibleCount = q ? tasks.length : sorted.length

  return (
    <SortableCardShell
      cardId={cardId}
      insertBefore={insertBefore}
      height={chromeLite ? undefined : state.cardHeights[cardId]}
      width={chromeLite ? undefined : width}
      onResizeHeight={onResizeHeight}
      onResizeWidth={onResizeWidth}
      enableWidthResize={!chromeLite}
      hideResizeChrome={chromeLite}
      headerLongPressDrag={chromeLite}
      className={collapsed ? 'is-collapsed' : ''}
      style={{ '--accent': list.color } as CSSProperties}
      title={
        <>
          <button
            type="button"
            className="card__toggle"
            onClick={() => onToggleCollapsed(list.id)}
            aria-expanded={!collapsed}
          >
            <span className="chev">{collapsed ? '▸' : '▾'}</span>
            <span className="card__dot" />
            <h2>{list.name}</h2>
          </button>
          <span className="card__count">{visibleCount}</span>
          <button
            type="button"
            className="ghost danger card__delete-list"
            title="Delete list"
            aria-label={`Delete list ${list.name}`}
            onClick={() => onDeleteList(list.id)}
          >
            ✕
          </button>
        </>
      }
    >
      {!collapsed && (
        <>
          <TaskDropBody
            containerId={`list:${list.id}`}
            height={chromeLite ? undefined : state.cardHeights[cardId]}
          >
            {tasks.length === 0 ? (
              <p className="card__empty">
                {q ? 'No matching tasks' : 'No tasks yet'}
              </p>
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
                      showListTag={task.listId !== list.id}
                      searchMatch={
                        Boolean(q) && task.text.toLowerCase().includes(q)
                      }
                      titleWrap={effectiveTitleWrap(state, task.id)}
                      dragDisabled={!dragEnabled}
                      insertBefore={taskInsertIndex === index}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onListChange={onListChange}
                      onClearNew={onClearNew}
                      onToggleTitleWrap={onToggleTaskTitleWrap}
                    />
                  ))}
                  {taskInsertIndex === tasks.length && (
                    <div className="insert-line insert-line--horizontal" />
                  )}
                </div>
              </SortableContext>
            )}
          </TaskDropBody>
          {!q && <AddTaskRow onAdd={(text) => onAddTask(list.id, text)} />}
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
  onToggleCollapsed: (playlistId: PlaylistId) => void
  onAddTask: (playlistId: PlaylistId, text: string) => void
  onResizeWidth: (cardId: string, width: number | null) => void
  /** Mobile agenda pager: always expanded, no card chrome/collapse. */
  pagerMode?: boolean
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
  onListChange,
  onClearNew,
  onTimeChange,
  onToggleCollapsed,
  onAddTask,
  onResizeHeight,
  onResizeWidth,
  onToggleTaskTitleWrap,
  taskInsertIndex = null,
  pagerMode = false,
}: PlaylistProps) {
  const collapsed = pagerMode ? false : state.collapsedPlaylists[playlistId]
  const q = query.trim().toLowerCase()
  const ids = state.playlists[playlistId]
  let tasks = ids
    .map((id) => state.tasks[id])
    .filter((t): t is Task => Boolean(t))

  // Desktop Today can still sort-by-time; mobile pager keeps manual order.
  if (sortByTime && playlistId === 'today' && !pagerMode) {
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
  // Pager: day label + count only. Desktop Today keeps clock/date + sort.
  const showFeaturedMeta = featured && !collapsed && !pagerMode

  return (
    <SortableCardShell
      cardId={cardId}
      insertBefore={insertBefore}
      height={pagerMode ? undefined : state.cardHeights[cardId]}
      width={pagerMode ? undefined : width}
      onResizeHeight={onResizeHeight}
      onResizeWidth={onResizeWidth}
      enableWidthResize={!pagerMode}
      hideResizeChrome={pagerMode}
      headerLongPressDrag={false}
      sortableDisabled={pagerMode}
      className={[
        'card--playlist',
        featured ? 'card--today' : '',
        collapsed ? 'is-collapsed' : '',
        pagerMode ? 'card--agenda-page' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={
        pagerMode ? (
          <>
            <div className="card__toggle" aria-hidden={false}>
              <h2>{title}</h2>
            </div>
            <span className="card__count">{tasks.length}</span>
          </>
        ) : (
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
        )
      }
    >
      {showFeaturedMeta && (
        <div className="card__today-meta">
          <div>
            {liveClock ? <p className="card__clock">{liveClock}</p> : null}
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
            height={pagerMode ? undefined : state.cardHeights[cardId]}
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
                      showListTag={!pagerMode}
                      searchMatch={
                        Boolean(q) && task.text.toLowerCase().includes(q)
                      }
                      titleWrap={effectiveTitleWrap(state, task.id)}
                      insertBefore={taskInsertIndex === index}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onTimeChange={onTimeChange}
                      onListChange={onListChange}
                      onClearNew={onClearNew}
                      onToggleTitleWrap={onToggleTaskTitleWrap}
                    />
                  ))}
                  {taskInsertIndex === tasks.length && (
                    <div className="insert-line insert-line--horizontal" />
                  )}
                </div>
              </SortableContext>
            )}
          </TaskDropBody>
          {!pagerMode && (
            <AddTaskRow onAdd={(text) => onAddTask(playlistId, text)} />
          )}
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
  hideResizeChrome = false,
  headerLongPressDrag = false,
  sortableDisabled = false,
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
  hideResizeChrome?: boolean
  /** Long-press the header to drag-reorder the whole list (mobile). */
  headerLongPressDrag?: boolean
  sortableDisabled?: boolean
  insertBefore?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card:${cardId}`,
    data: { type: 'card', cardId } satisfies CardDragData,
    disabled: sortableDisabled,
  })

  const cardStyle: CSSProperties = {
    ...style,
    transform: sortableDisabled
      ? undefined
      : CSS.Transform.toString(transform),
    transition: sortableDisabled ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
    width: width ?? undefined,
    minWidth: width ?? undefined,
  }

  const showDesktopHandle = !hideResizeChrome && !headerLongPressDrag

  return (
    <>
      {insertBefore && <div className="insert-line insert-line--horizontal" />}
      <section
        ref={setNodeRef}
        style={cardStyle}
        data-card-id={cardId}
        className={`card ${className} ${isDragging ? 'is-dragging-card' : ''}`}
      >
        <header
          className={`card__head${headerLongPressDrag ? ' card__head--longpress' : ''}`}
          ref={headerLongPressDrag ? setActivatorNodeRef : undefined}
          {...(headerLongPressDrag ? listeners : {})}
          title={
            headerLongPressDrag ? 'Press and hold to reorder list' : undefined
          }
          aria-roledescription={
            headerLongPressDrag ? 'sortable list' : undefined
          }
        >
          {showDesktopHandle && (
            <DragHandle
              attributes={attributes}
              listeners={listeners}
              setActivatorRef={setActivatorNodeRef}
            />
          )}
          {title}
        </header>
        {children}
        {!hideResizeChrome && (
          <ResizeHandle
            cardId={cardId}
            height={height}
            onResize={onResizeHeight}
          />
        )}
        {!hideResizeChrome && enableWidthResize && onResizeWidth && (
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

function effectiveTitleWrap(state: AppState, taskId: string): boolean {
  if (Object.prototype.hasOwnProperty.call(state.taskTitleWrapOverrides, taskId)) {
    return state.taskTitleWrapOverrides[taskId]
  }
  return state.wrapTaskTitles
}
