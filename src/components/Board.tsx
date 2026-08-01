import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useBoardGestures } from '../hooks/useBoardGestures'
import { flattenBoard, isPlaylistId, orderedListTasks } from '../lib/board'
import { scrollCardIntoBoardView } from '../lib/focusTask'
import {
  LIST_SORT_LABELS,
  LIST_SORT_MODES,
  loadListSortMode,
  saveListSortMode,
  type ListSortMode,
} from '../lib/listSort'
import type { AppState, PlaylistId } from '../lib/types'
import type { InsertionState } from './InsertionLine'
import { ContextListCard, PlaylistCard, renderCardIdIsPlaylist } from './ListCard'
import { MobileAgenda } from './MobileAgenda'

type Props = {
  state: AppState
  query: string
  liveClock: string
  liveDate: string
  insertion: InsertionState
  boardZoomOut: boolean
  onBoardZoomOutChange: (zoomOut: boolean) => void
  /** Phones / narrow viewports: agenda pager + stacked category lists. */
  mobileNative?: boolean
  /** Scroll-target board card id when `mobileNative` is on (capture / search / deep-link). */
  activeCardId?: string | null
  onActiveCardIdChange?: (cardId: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onDeleteList: (listId: string) => void
  onListChange: (id: string, listId: string) => void
  onClearNew: (id: string) => void
  onTimeChange: (id: string, time: string | null) => void
  onToggleListCollapsed: (listId: string) => void
  onTogglePlaylistCollapsed: (playlistId: PlaylistId) => void
  onAddToList: (listId: string, text: string) => void
  onAddToPlaylist: (playlistId: PlaylistId, text: string) => void
  onSortByTimeChange: (value: boolean) => void
  onResizeHeight: (cardId: string, height: number | null) => void
  onResizeWidth: (cardId: string, width: number | null) => void
  onToggleTaskTitleWrap: (taskId: string) => void
}

export function Board({
  state,
  query,
  liveClock,
  liveDate,
  insertion,
  boardZoomOut,
  onBoardZoomOutChange,
  mobileNative = false,
  activeCardId = null,
  onActiveCardIdChange,
  onToggle,
  onDelete,
  onDeleteList,
  onListChange,
  onClearNew,
  onTimeChange,
  onToggleListCollapsed,
  onTogglePlaylistCollapsed,
  onAddToList,
  onAddToPlaylist,
  onSortByTimeChange,
  onResizeHeight,
  onResizeWidth,
  onToggleTaskTitleWrap,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const cardIds = useMemo(
    () => flattenBoard(state.boardColumns),
    [state.boardColumns],
  )
  const listCardIds = useMemo(
    () => cardIds.filter((id) => !isPlaylistId(id)),
    [cardIds],
  )
  const resolvedActiveId =
    activeCardId && cardIds.includes(activeCardId)
      ? activeCardId
      : (cardIds[0] ?? null)

  const { showSnapBack, snapBackToStart } = useBoardGestures(boardRef, {
    boardZoomOut,
    onBoardZoomOutChange,
    enabled: !mobileNative,
  })

  const sharedCardProps = {
    state,
    query,
    onToggle,
    onDelete,
    onListChange,
    onClearNew,
    onResizeHeight,
    onResizeWidth,
    onToggleTaskTitleWrap,
  }

  if (mobileNative && cardIds.length > 0) {
    return (
      <MobileNativeBoard
        state={state}
        query={query}
        liveClock={liveClock}
        liveDate={liveDate}
        insertion={insertion}
        listCardIds={listCardIds}
        resolvedActiveId={resolvedActiveId}
        onActiveCardIdChange={onActiveCardIdChange}
        sharedCardProps={sharedCardProps}
        onTimeChange={onTimeChange}
        onToggleListCollapsed={onToggleListCollapsed}
        onTogglePlaylistCollapsed={onTogglePlaylistCollapsed}
        onAddToList={onAddToList}
        onAddToPlaylist={onAddToPlaylist}
        onSortByTimeChange={onSortByTimeChange}
        onDeleteList={onDeleteList}
      />
    )
  }

  return (
    <div className="board-shell">
      <div ref={boardRef} className="board" aria-label="Lana OS board" data-board>
        <ColumnGap index={0} active={insertion?.kind === 'column' && insertion.index === 0} />

        {state.boardColumns.map((column, colIndex) => {
          const sortableCardIds = column.map((id) => `card:${id}`)
          const colWidth = columnWidth(column, state.cardWidths)
          return (
            <div key={`col-${colIndex}`} className="board__col-wrap">
              <BoardColumn columnIndex={colIndex} width={colWidth}>
                <SortableContext
                  items={sortableCardIds}
                  strategy={verticalListSortingStrategy}
                >
                  {column.map((cardId, cardIndex) => {
                    const insertBefore =
                      insertion?.kind === 'card' &&
                      insertion.column === colIndex &&
                      insertion.index === cardIndex

                    const taskInsertIndex =
                      insertion?.kind === 'task' &&
                      (insertion.containerId === cardId ||
                        insertion.containerId === `list:${cardId}` ||
                        insertion.containerId === `playlist:${cardId}`)
                        ? insertion.index
                        : null

                    if (renderCardIdIsPlaylist(cardId)) {
                      return (
                        <PlaylistCard
                          key={cardId}
                          cardId={cardId}
                          playlistId={cardId}
                          {...sharedCardProps}
                          featured={cardId === 'today'}
                          liveClock={liveClock}
                          liveDate={liveDate}
                          sortByTime={state.sortTodayByTime}
                          onSortByTimeChange={onSortByTimeChange}
                          insertBefore={insertBefore}
                          taskInsertIndex={taskInsertIndex}
                          onTimeChange={onTimeChange}
                          onToggleCollapsed={onTogglePlaylistCollapsed}
                          onAddTask={onAddToPlaylist}
                        />
                      )
                    }

                    return (
                      <ContextListCard
                        key={cardId}
                        cardId={cardId}
                        listId={cardId}
                        {...sharedCardProps}
                        insertBefore={insertBefore}
                        taskInsertIndex={taskInsertIndex}
                        onDeleteList={onDeleteList}
                        onToggleCollapsed={onToggleListCollapsed}
                        onAddTask={onAddToList}
                      />
                    )
                  })}
                  {insertion?.kind === 'card' &&
                    insertion.column === colIndex &&
                    insertion.index === column.length && (
                      <div className="insert-line insert-line--horizontal" />
                    )}
                </SortableContext>
              </BoardColumn>
              <ColumnGap
                index={colIndex + 1}
                active={
                  insertion?.kind === 'column' && insertion.index === colIndex + 1
                }
              />
            </div>
          )
        })}
      </div>

      {showSnapBack && (
        <button
          type="button"
          className="board-snapback"
          onClick={snapBackToStart}
          aria-label="Back to Today playlist"
          title="Back to Today"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
            <path
              d="M12.5 4.5 7 10l5.5 5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 10h8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

type SharedCardProps = {
  state: AppState
  query: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onListChange: (id: string, listId: string) => void
  onClearNew: (id: string) => void
  onResizeHeight: (cardId: string, height: number | null) => void
  onResizeWidth: (cardId: string, width: number | null) => void
  onToggleTaskTitleWrap: (taskId: string) => void
}

function MobileNativeBoard({
  state,
  liveClock,
  liveDate,
  insertion,
  listCardIds,
  resolvedActiveId,
  onActiveCardIdChange,
  sharedCardProps,
  onTimeChange,
  onTogglePlaylistCollapsed,
  onAddToList,
  onAddToPlaylist,
  onSortByTimeChange,
  onDeleteList,
}: {
  state: AppState
  query: string
  liveClock: string
  liveDate: string
  insertion: InsertionState
  listCardIds: string[]
  resolvedActiveId: string | null
  onActiveCardIdChange?: (cardId: string) => void
  sharedCardProps: SharedCardProps
  onTimeChange: (id: string, time: string | null) => void
  onToggleListCollapsed: (listId: string) => void
  onTogglePlaylistCollapsed: (playlistId: PlaylistId) => void
  onAddToList: (listId: string, text: string) => void
  onAddToPlaylist: (playlistId: PlaylistId, text: string) => void
  onSortByTimeChange: (value: boolean) => void
  onDeleteList: (listId: string) => void
}) {
  const [agendaPlaylistId, setAgendaPlaylistId] = useState<PlaylistId>(() =>
    resolvedActiveId && isPlaylistId(resolvedActiveId)
      ? resolvedActiveId
      : 'today',
  )
  const [listSortMode, setListSortMode] = useState<ListSortMode>(loadListSortMode)
  /** Empty lists start collapsed; user can expand. Non-empty start expanded. */
  const [expandedEmptyIds, setExpandedEmptyIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [userCollapsedIds, setUserCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  )

  const listTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const listId of listCardIds) {
      counts[listId] = orderedListTasks(state, listId, {
        hidePlanned: true,
      }).length
    }
    return counts
  }, [listCardIds, state])

  // Drop empty-list expand flags once a list gains tasks (stays open via default).
  useEffect(() => {
    setExpandedEmptyIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of prev) {
        if ((listTaskCounts[id] ?? 0) > 0) {
          next.delete(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
    setUserCollapsedIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of prev) {
        if ((listTaskCounts[id] ?? 0) === 0) {
          next.delete(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [listTaskCounts])

  const isListCollapsed = useCallback(
    (listId: string): boolean => {
      const count = listTaskCounts[listId] ?? 0
      if (count === 0) return !expandedEmptyIds.has(listId)
      return userCollapsedIds.has(listId)
    },
    [listTaskCounts, expandedEmptyIds, userCollapsedIds],
  )

  const toggleMobileList = useCallback(
    (listId: string) => {
      const count = listTaskCounts[listId] ?? 0
      if (count === 0) {
        setExpandedEmptyIds((prev) => {
          const next = new Set(prev)
          if (next.has(listId)) next.delete(listId)
          else next.add(listId)
          return next
        })
        return
      }
      setUserCollapsedIds((prev) => {
        const next = new Set(prev)
        if (next.has(listId)) next.delete(listId)
        else next.add(listId)
        return next
      })
    },
    [listTaskCounts],
  )

  const ensureListExpanded = useCallback(
    (listId: string) => {
      const count = listTaskCounts[listId] ?? 0
      if (count === 0) {
        setExpandedEmptyIds((prev) => {
          if (prev.has(listId)) return prev
          const next = new Set(prev)
          next.add(listId)
          return next
        })
        return
      }
      setUserCollapsedIds((prev) => {
        if (!prev.has(listId)) return prev
        const next = new Set(prev)
        next.delete(listId)
        return next
      })
    },
    [listTaskCounts],
  )

  // Capture / search / deep-link → agenda page or expand+scroll category list.
  useEffect(() => {
    if (!resolvedActiveId) return
    if (isPlaylistId(resolvedActiveId)) {
      setAgendaPlaylistId(resolvedActiveId)
      return
    }
    ensureListExpanded(resolvedActiveId)
    const timer = window.setTimeout(() => {
      scrollCardIntoBoardView(resolvedActiveId, { align: 'start' })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [resolvedActiveId, ensureListExpanded])

  const onAgendaChange = useCallback(
    (id: PlaylistId) => {
      setAgendaPlaylistId(id)
      onActiveCardIdChange?.(id)
    },
    [onActiveCardIdChange],
  )

  const onSortModeChange = useCallback((mode: ListSortMode) => {
    setListSortMode(mode)
    saveListSortMode(mode)
  }, [])

  const sortableCardIds = useMemo(
    () => listCardIds.map((id) => `card:${id}`),
    [listCardIds],
  )

  return (
    <div className="board-shell board-shell--native">
      <div
        className="board board--native"
        aria-label="Lana OS mobile"
        data-board
        data-mobile-native="true"
      >
        <MobileAgenda
          activePlaylistId={agendaPlaylistId}
          onActivePlaylistChange={onAgendaChange}
        >
          {(playlistId) => {
            const taskInsertIndex =
              insertion?.kind === 'task' &&
              (insertion.containerId === playlistId ||
                insertion.containerId === `playlist:${playlistId}`)
                ? insertion.index
                : null
            return (
              <PlaylistCard
                cardId={playlistId}
                playlistId={playlistId}
                {...sharedCardProps}
                featured={playlistId === 'today'}
                liveClock={liveClock}
                liveDate={liveDate}
                sortByTime={state.sortTodayByTime}
                onSortByTimeChange={onSortByTimeChange}
                taskInsertIndex={taskInsertIndex}
                onTimeChange={onTimeChange}
                onToggleCollapsed={onTogglePlaylistCollapsed}
                onAddTask={onAddToPlaylist}
                pagerMode
              />
            )
          }}
        </MobileAgenda>

        <section className="mobile-lists" aria-label="Lists">
          <div className="mobile-lists__toolbar">
            <h2 className="mobile-lists__title">Lists</h2>
            <label className="mobile-lists__sort">
              <span className="mobile-lists__sort-label">Sort</span>
              <select
                value={listSortMode}
                onChange={(e) =>
                  onSortModeChange(e.target.value as ListSortMode)
                }
                aria-label="Sort lists"
              >
                {LIST_SORT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {LIST_SORT_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mobile-lists__scroll" data-lists-scroll>
            <SortableContext
              items={sortableCardIds}
              strategy={verticalListSortingStrategy}
            >
              {listCardIds.map((cardId) => {
                const taskInsertIndex =
                  insertion?.kind === 'task' &&
                  (insertion.containerId === cardId ||
                    insertion.containerId === `list:${cardId}`)
                    ? insertion.index
                    : null
                return (
                  <ContextListCard
                    key={cardId}
                    cardId={cardId}
                    listId={cardId}
                    {...sharedCardProps}
                    taskInsertIndex={taskInsertIndex}
                    onDeleteList={onDeleteList}
                    onToggleCollapsed={toggleMobileList}
                    onAddTask={onAddToList}
                    forceCollapsed={isListCollapsed(cardId)}
                    listSortMode={listSortMode}
                    chromeLite
                  />
                )
              })}
            </SortableContext>
          </div>
        </section>
      </div>
    </div>
  )
}

function columnWidth(
  column: string[],
  widths: Record<string, number>,
): number | undefined {
  let max = 0
  for (const id of column) {
    if (widths[id]) max = Math.max(max, widths[id])
  }
  return max > 0 ? max : undefined
}

function BoardColumn({
  columnIndex,
  width,
  children,
}: {
  columnIndex: number
  width?: number
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${columnIndex}`,
    data: { type: 'column', columnIndex },
  })

  const style: CSSProperties | undefined = width
    ? { width, flexBasis: width }
    : undefined

  return (
    <div
      ref={setNodeRef}
      className={`board__col ${isOver ? 'is-col-over' : ''}`}
      style={style}
    >
      {children}
    </div>
  )
}

function ColumnGap({ index, active }: { index: number; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `colgap:${index}`,
    data: { type: 'column-gap', index },
  })

  return (
    <div
      ref={setNodeRef}
      className={`board__gap ${isOver || active ? 'is-active' : ''}`}
    >
      {(isOver || active) && (
        <div className="insert-line insert-line--vertical" />
      )}
    </div>
  )
}
