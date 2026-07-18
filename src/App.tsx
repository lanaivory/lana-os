import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { CaptureBar } from './components/CaptureBar'
import { HeaderBar } from './components/HeaderBar'
import { ContextListCard, PlaylistCard } from './components/ListCard'
import { SettingsModal } from './components/SettingsModal'
import { useLanaStore } from './hooks/useLanaStore'
import type { PlaylistId } from './lib/types'
import './App.css'

const PLAYLIST_IDS: PlaylistId[] = ['today', 'tomorrow', 'week']

export default function App() {
  const store = useLanaStore()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [searchFocusSignal, setSearchFocusSignal] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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
    if (!activeId) return null
    const id = parseDragTaskId(activeId)
    return store.state.tasks[id] ?? null
  }, [activeId, store.state.tasks])

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as
      | { from: PlaylistId | 'list'; taskId?: string }
      | undefined
    const overData = over.data.current as
      | { playlistId?: PlaylistId; from?: PlaylistId | 'list'; taskId?: string }
      | undefined

    const taskId = activeData?.taskId ?? parseDragTaskId(String(active.id))
    const overPlaylist = resolvePlaylistTarget(String(over.id), overData)
    const fromPlaylist =
      activeData?.from && activeData.from !== 'list'
        ? activeData.from
        : findPlaylistContaining(store.state.playlists, taskId)

    if (!overPlaylist) return

    if (fromPlaylist === overPlaylist) {
      const ids = store.state.playlists[overPlaylist]
      const oldIndex = ids.indexOf(taskId)
      const overTaskId = String(over.id).startsWith('drop-')
        ? null
        : (overData?.taskId ?? parseDragTaskId(String(over.id)))
      const newIndex = overTaskId ? ids.indexOf(overTaskId) : ids.length - 1
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        store.reorderPlaylist(overPlaylist, arrayMove(ids, oldIndex, newIndex))
      }
      return
    }

    const dest = store.state.playlists[overPlaylist]
    const overTaskId = String(over.id).startsWith('drop-')
      ? null
      : (overData?.taskId ?? parseDragTaskId(String(over.id)))
    const toIndex = overTaskId
      ? Math.max(0, dest.indexOf(overTaskId))
      : dest.length

    store.moveBetweenPlaylists(taskId, fromPlaylist, overPlaylist, toIndex)
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

      <CaptureBar onCapture={store.capture} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="board" aria-label="Lana OS board">
          <div className="board__col board__col--plan">
            <PlaylistCard
              playlistId="today"
              state={store.state}
              query={deferredQuery}
              featured
              liveClock={liveClock}
              liveDate={liveDate}
              sortByTime={store.state.sortTodayByTime}
              onSortByTimeChange={store.setSortTodayByTime}
              onToggle={store.toggleComplete}
              onDelete={store.deleteTask}
              onTimeChange={store.setTaskTime}
              onRemoveFromPlaylist={store.removeFromPlaylist}
              onToggleCollapsed={store.togglePlaylistCollapsed}
              onAddTask={store.addTaskToPlaylist}
            />
            <PlaylistCard
              playlistId="tomorrow"
              state={store.state}
              query={deferredQuery}
              onToggle={store.toggleComplete}
              onDelete={store.deleteTask}
              onTimeChange={store.setTaskTime}
              onRemoveFromPlaylist={store.removeFromPlaylist}
              onToggleCollapsed={store.togglePlaylistCollapsed}
              onAddTask={store.addTaskToPlaylist}
            />
            <PlaylistCard
              playlistId="week"
              state={store.state}
              query={deferredQuery}
              onToggle={store.toggleComplete}
              onDelete={store.deleteTask}
              onTimeChange={store.setTaskTime}
              onRemoveFromPlaylist={store.removeFromPlaylist}
              onToggleCollapsed={store.togglePlaylistCollapsed}
              onAddTask={store.addTaskToPlaylist}
            />
          </div>

          {store.state.lists.map((list) => (
            <div key={list.id} className="board__col">
              <ContextListCard
                listId={list.id}
                state={store.state}
                query={deferredQuery}
                onToggle={store.toggleComplete}
                onDelete={store.deleteTask}
                onToggleCollapsed={store.toggleListCollapsed}
                onAddTask={store.addTaskToList}
              />
            </div>
          ))}
        </div>

        <DragOverlay
          dropAnimation={{ duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }}
        >
          {activeTask ? (
            <div className="task task--overlay">
              <p className="task__text">{activeTask.text}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function resolvePlaylistTarget(
  overId: string,
  overData?: { playlistId?: PlaylistId; from?: PlaylistId | 'list' },
): PlaylistId | null {
  if (overData?.playlistId) return overData.playlistId
  if (overId.startsWith('drop-')) {
    return overId.replace('drop-', '') as PlaylistId
  }
  if (overData?.from && overData.from !== 'list') return overData.from
  const fromComposite = overId.match(/^(today|tomorrow|week):/)
  if (fromComposite) return fromComposite[1] as PlaylistId
  return null
}

function findPlaylistContaining(
  playlists: Record<PlaylistId, string[]>,
  taskId: string,
): PlaylistId | null {
  for (const id of PLAYLIST_IDS) {
    if (playlists[id].includes(taskId)) return id
  }
  return null
}

function parseDragTaskId(dragId: string): string {
  if (dragId.startsWith('list-')) return dragId.slice(5)
  const composite = dragId.match(/^(?:today|tomorrow|week):(.+)$/)
  if (composite) return composite[1]
  return dragId
}
