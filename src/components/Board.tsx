import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useBoardGestures } from '../hooks/useBoardGestures'
import { flattenBoard } from '../lib/board'
import type { AppState, PlaylistId } from '../lib/types'
import type { InsertionState } from './InsertionLine'
import { ContextListCard, PlaylistCard, renderCardIdIsPlaylist } from './ListCard'
import { MobileListSwitcher } from './MobileListSwitcher'

type Props = {
  state: AppState
  query: string
  liveClock: string
  liveDate: string
  insertion: InsertionState
  boardZoomOut: boolean
  onBoardZoomOutChange: (zoomOut: boolean) => void
  /** Phones / narrow viewports: one full-width list + switcher (not the 2D board). */
  mobileNative?: boolean
  /** Active board card id when `mobileNative` is on. */
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
  const resolvedActiveId =
    activeCardId && cardIds.includes(activeCardId)
      ? activeCardId
      : (cardIds[0] ?? null)

  // Auto-expand the visible card so the single-list view is never blank.
  useEffect(() => {
    if (!mobileNative || !resolvedActiveId) return
    if (renderCardIdIsPlaylist(resolvedActiveId)) {
      if (state.collapsedPlaylists[resolvedActiveId]) {
        onTogglePlaylistCollapsed(resolvedActiveId)
      }
      return
    }
    const list = state.lists.find((l) => l.id === resolvedActiveId)
    if (list?.collapsed) onToggleListCollapsed(resolvedActiveId)
  }, [
    mobileNative,
    resolvedActiveId,
    state.collapsedPlaylists,
    state.lists,
    onToggleListCollapsed,
    onTogglePlaylistCollapsed,
  ])

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

  if (mobileNative && resolvedActiveId) {
    const taskInsertIndex =
      insertion?.kind === 'task' &&
      (insertion.containerId === resolvedActiveId ||
        insertion.containerId === `list:${resolvedActiveId}` ||
        insertion.containerId === `playlist:${resolvedActiveId}`)
        ? insertion.index
        : null

    return (
      <div className="board-shell board-shell--native">
        <MobileListSwitcher
          state={state}
          cardIds={cardIds}
          activeCardId={resolvedActiveId}
          onActiveCardIdChange={(id) => onActiveCardIdChange?.(id)}
        />
        <div
          ref={boardRef}
          className="board board--native"
          aria-label="Lana OS list"
          data-board
          data-mobile-native="true"
        >
          <SortableContext
            items={[`card:${resolvedActiveId}`]}
            strategy={verticalListSortingStrategy}
          >
            {renderCardIdIsPlaylist(resolvedActiveId) ? (
              <PlaylistCard
                key={resolvedActiveId}
                cardId={resolvedActiveId}
                playlistId={resolvedActiveId}
                {...sharedCardProps}
                featured={resolvedActiveId === 'today'}
                liveClock={liveClock}
                liveDate={liveDate}
                sortByTime={state.sortTodayByTime}
                onSortByTimeChange={onSortByTimeChange}
                taskInsertIndex={taskInsertIndex}
                onTimeChange={onTimeChange}
                onToggleCollapsed={onTogglePlaylistCollapsed}
                onAddTask={onAddToPlaylist}
              />
            ) : (
              <ContextListCard
                key={resolvedActiveId}
                cardId={resolvedActiveId}
                listId={resolvedActiveId}
                {...sharedCardProps}
                taskInsertIndex={taskInsertIndex}
                onDeleteList={onDeleteList}
                onToggleCollapsed={onToggleListCollapsed}
                onAddTask={onAddToList}
              />
            )}
          </SortableContext>
        </div>
      </div>
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
