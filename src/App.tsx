import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Board } from './components/Board'
import { CaptureBar } from './components/CaptureBar'
import { HeaderBar } from './components/HeaderBar'
import type { InsertionState } from './components/InsertionLine'
import { SettingsModal } from './components/SettingsModal'
import { useLanaStore } from './hooks/useLanaStore'
import {
  cardIdFromOverTarget,
  findPlaylistContaining,
  isPlaylistId,
  orderedListTasks,
} from './lib/board'
import type { PlaylistId } from './lib/types'
import './App.css'

type ActiveDrag =
  | { type: 'task'; taskId: string; from: 'playlist' | 'list'; containerId: string }
  | { type: 'card'; cardId: string }
  | null

export default function App() {
  const store = useLanaStore()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [searchFocusSignal, setSearchFocusSignal] = useState(0)
  const [active, setActive] = useState<ActiveDrag>(null)
  const [insertion, setInsertion] = useState<InsertionState>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchFocusSignal((n) => n + 1)
      }
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey && !isEditable(e.target)) {
        e.preventDefault()
        store.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  const liveClock = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(now),
    [now],
  )

  const liveDate = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(now),
    [now],
  )

  const activeTask = useMemo(() => {
    if (!active || active.type !== 'task') return null
    return store.state.tasks[active.taskId] ?? null
  }, [active, store.state.tasks])

  const activeCardLabel = useMemo(() => {
    if (!active || active.type !== 'card') return null
    if (isPlaylistId(active.cardId)) {
      if (active.cardId === 'today') return 'Today'
      if (active.cardId === 'tomorrow') return 'Tomorrow'
      return 'This Week'
    }
    return store.state.lists.find((l) => l.id === active.cardId)?.name ?? 'List'
  }, [active, store.state.lists])

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: string; taskId?: string; from?: 'playlist' | 'list'; containerId?: string; cardId?: string }
      | undefined

    if (data?.type === 'task' && data.taskId && data.from && data.containerId) {
      setActive({
        type: 'task',
        taskId: data.taskId,
        from: data.from,
        containerId: data.containerId,
      })
      return
    }
    if (data?.type === 'card' && data.cardId) {
      setActive({ type: 'card', cardId: data.cardId })
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active: a, over } = event
    if (!over) {
      setInsertion(null)
      return
    }

    const activeData = a.data.current as { type?: string } | undefined
    const overData = over.data.current as Record<string, unknown> | undefined
    const overId = String(over.id)

    if (activeData?.type === 'card') {
      if (overData?.type === 'column-gap') {
        setInsertion({ kind: 'column', index: Number(overData.index) })
        return
      }
      if (overData?.type === 'column') {
        const col = Number(overData.columnIndex)
        const len = store.state.boardColumns[col]?.length ?? 0
        setInsertion({ kind: 'card', column: col, index: len })
        return
      }

      // Cards nest task droppables — resolve the parent card from any over target.
      const overCardId =
        (overData?.type === 'card' && (overData.cardId as string | undefined)) ||
        cardIdFromOverTarget(overId)

      if (overCardId) {
        const loc = findCardLocation(store.state.boardColumns, overCardId)
        if (!loc) {
          setInsertion(null)
          return
        }
        const rect = over.rect
        const translated = a.rect.current.translated
        const pointerY = translated
          ? translated.top + translated.height / 2
          : rect.top
        const before = pointerY < rect.top + rect.height / 2
        setInsertion({
          kind: 'card',
          column: loc.column,
          index: before ? loc.index : loc.index + 1,
        })
        return
      }
      setInsertion(null)
      return
    }

    if (activeData?.type === 'task') {
      const target = resolveTaskDropTarget(overId, overData, store.state)
      if (!target) {
        setInsertion(null)
        return
      }

      const ids = getContainerTaskIds(store.state, target)
      let index = ids.length

      if (target.overTaskId) {
        const idx = ids.indexOf(target.overTaskId)
        if (idx !== -1) {
          const rect = over.rect
          const translated = a.rect.current.translated
          const pointerY = translated
            ? translated.top + translated.height / 2
            : rect.top
          const before = pointerY < rect.top + rect.height / 2
          index = before ? idx : idx + 1
        }
      }

      setInsertion({
        kind: 'task',
        containerId: target.containerKey,
        index,
      })
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    const current = active
    const currentInsertion = insertion
    setActive(null)
    setInsertion(null)

    const { over } = event
    if (!over || !current) return

    if (current.type === 'card') {
      applyCardDrop(current.cardId, currentInsertion, over, store)
      return
    }

    applyTaskDrop(current, currentInsertion, over, store)
  }

  const onNewList = () => {
    const name = window.prompt('New list name')
    if (name === null) return
    store.createList(name)
  }

  return (
    <div className={`os theme-${store.state.theme}`}>
      <HeaderBar
        query={query}
        onQueryChange={setQuery}
        searchFocusSignal={searchFocusSignal}
        canUndo={store.canUndo}
        onUndo={store.undo}
        onClearCompleted={store.clearCompleted}
        onNewList={onNewList}
        theme={store.state.theme}
        onToggleTheme={store.toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActive(null)
          setInsertion(null)
        }}
      >
        <Board
          state={store.state}
          query={deferredQuery}
          liveClock={liveClock}
          liveDate={liveDate}
          insertion={insertion}
          onToggle={store.toggleComplete}
          onDelete={store.deleteTask}
          onTimeChange={store.setTaskTime}
          onRemoveFromPlaylist={store.removeFromPlaylist}
          onToggleListCollapsed={store.toggleListCollapsed}
          onTogglePlaylistCollapsed={store.togglePlaylistCollapsed}
          onAddToList={store.addTaskToList}
          onAddToPlaylist={store.addTaskToPlaylist}
          onSortByTimeChange={store.setSortTodayByTime}
          onResizeHeight={store.setCardHeight}
          onResizeWidth={store.setCardWidth}
        />

        <DragOverlay
          dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}
        >
          {activeTask ? (
            <div className="task task--overlay">
              <p className="task__text">{activeTask.text}</p>
            </div>
          ) : activeCardLabel ? (
            <div className="card card--overlay">
              <h2>{activeCardLabel}</h2>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CaptureBar onCapture={store.capture} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function findCardLocation(
  columns: string[][],
  cardId: string,
): { column: number; index: number } | null {
  for (let c = 0; c < columns.length; c++) {
    const index = columns[c].indexOf(cardId)
    if (index !== -1) return { column: c, index }
  }
  return null
}

function resolveTaskDropTarget(
  overId: string,
  overData: Record<string, unknown> | undefined,
  state: ReturnType<typeof useLanaStore>['state'],
): {
  kind: 'playlist' | 'list'
  id: string
  containerKey: string
  overTaskId: string | null
} | null {
  if (overData?.type === 'task-container') {
    const containerId = String(overData.containerId)
    if (containerId.startsWith('playlist:')) {
      const id = containerId.slice('playlist:'.length)
      return {
        kind: 'playlist',
        id,
        containerKey: id,
        overTaskId: null,
      }
    }
    if (containerId.startsWith('list:')) {
      const id = containerId.slice('list:'.length)
      return { kind: 'list', id, containerKey: id, overTaskId: null }
    }
    if (overData.playlistId) {
      const id = String(overData.playlistId)
      return { kind: 'playlist', id, containerKey: id, overTaskId: null }
    }
    if (overData.listId) {
      const id = String(overData.listId)
      return { kind: 'list', id, containerKey: id, overTaskId: null }
    }
  }

  if (overData?.type === 'task' || overId.startsWith('task:')) {
    const parts = overId.split(':')
    // task:list:listId:taskId or task:playlist:playlistId:taskId
    if (parts.length >= 4) {
      const scope = parts[1]
      const container = parts[2]
      const taskId = parts.slice(3).join(':')
      if (scope === 'playlist' && isPlaylistId(container)) {
        return {
          kind: 'playlist',
          id: container,
          containerKey: container,
          overTaskId: taskId,
        }
      }
      if (scope === 'list') {
        return {
          kind: 'list',
          id: container,
          containerKey: container,
          overTaskId: taskId,
        }
      }
    }
    const taskId = (overData?.taskId as string | undefined) ?? null
    const containerId = overData?.containerId as string | undefined
    const from = overData?.from as 'playlist' | 'list' | undefined
    if (taskId && containerId && from) {
      return {
        kind: from,
        id: containerId,
        containerKey: containerId,
        overTaskId: taskId,
      }
    }
  }

  // Dropping on a card shell — treat as that container
  if (overId.startsWith('card:')) {
    const cardId = overId.slice(5)
    if (isPlaylistId(cardId)) {
      return {
        kind: 'playlist',
        id: cardId,
        containerKey: cardId,
        overTaskId: null,
      }
    }
    if (state.lists.some((l) => l.id === cardId)) {
      return {
        kind: 'list',
        id: cardId,
        containerKey: cardId,
        overTaskId: null,
      }
    }
  }

  return null
}

function getContainerTaskIds(
  state: ReturnType<typeof useLanaStore>['state'],
  target: { kind: 'playlist' | 'list'; id: string },
): string[] {
  if (target.kind === 'playlist' && isPlaylistId(target.id)) {
    return state.playlists[target.id].filter((id) => state.tasks[id])
  }
  return orderedListTasks(state, target.id, { hidePlanned: true })
}

function applyCardDrop(
  cardId: string,
  insertion: InsertionState,
  over: { id: string | number; data: { current?: unknown } },
  store: ReturnType<typeof useLanaStore>,
) {
  if (insertion?.kind === 'column') {
    store.moveBoardCard(cardId, { newColumnAt: insertion.index })
    return
  }
  if (insertion?.kind === 'card') {
    store.moveBoardCard(cardId, {
      column: insertion.column,
      index: insertion.index,
    })
    return
  }

  const overData = over.data.current as Record<string, unknown> | undefined
  const overId = String(over.id)
  if (overData?.type === 'column-gap') {
    store.moveBoardCard(cardId, { newColumnAt: Number(overData.index) })
    return
  }
  if (overData?.type === 'column') {
    const col = Number(overData.columnIndex)
    store.moveBoardCard(cardId, {
      column: col,
      index: store.state.boardColumns[col]?.length ?? 0,
    })
    return
  }
  if (overId.startsWith('card:')) {
    const targetId = overId.slice(5)
    const loc = findCardLocation(store.state.boardColumns, targetId)
    if (loc) {
      store.moveBoardCard(cardId, {
        column: loc.column,
        index: loc.index,
      })
    }
  }
}

function applyTaskDrop(
  current: {
    type: 'task'
    taskId: string
    from: 'playlist' | 'list'
    containerId: string
  },
  insertion: InsertionState,
  over: { id: string | number; data: { current?: unknown } },
  store: ReturnType<typeof useLanaStore>,
) {
  const overData = over.data.current as Record<string, unknown> | undefined
  const target =
    insertion?.kind === 'task'
      ? inferTargetFromInsertion(insertion, store.state)
      : resolveTaskDropTarget(String(over.id), overData, store.state)

  if (!target) return

  const index =
    insertion?.kind === 'task'
      ? insertion.index
      : getContainerTaskIds(store.state, target).length

  if (target.kind === 'playlist' && isPlaylistId(target.id)) {
    const fromPlaylist =
      current.from === 'playlist'
        ? (current.containerId as PlaylistId)
        : findPlaylistContaining(store.state, current.taskId)

    if (fromPlaylist === target.id) {
      const ids = [...store.state.playlists[target.id]]
      const oldIndex = ids.indexOf(current.taskId)
      if (oldIndex === -1) return
      ids.splice(oldIndex, 1)
      const nextIndex = Math.min(index > oldIndex ? index - 1 : index, ids.length)
      ids.splice(nextIndex, 0, current.taskId)
      store.reorderPlaylist(target.id, ids)
      return
    }

    store.moveBetweenPlaylists(current.taskId, fromPlaylist, target.id, index)
    return
  }

  // Context list drop — returns from playlist and/or moves between lists
  store.moveTaskInLists(current.taskId, target.id, index)
}

function inferTargetFromInsertion(
  insertion: Extract<InsertionState, { kind: 'task' }>,
  state: ReturnType<typeof useLanaStore>['state'],
): {
  kind: 'playlist' | 'list'
  id: string
  containerKey: string
  overTaskId: string | null
} | null {
  const id = insertion.containerId.replace(/^(list:|playlist:)/, '')
  if (isPlaylistId(id) || state.playlists[id as PlaylistId]) {
    if (isPlaylistId(id)) {
      return { kind: 'playlist', id, containerKey: id, overTaskId: null }
    }
  }
  if (state.lists.some((l) => l.id === id)) {
    return { kind: 'list', id, containerKey: id, overTaskId: null }
  }
  return null
}
