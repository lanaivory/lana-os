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
import { ContextLists } from './components/ContextLists'
import { PlaylistPanel } from './components/PlaylistPanel'
import { useLanaStore } from './hooks/useLanaStore'
import type { PlaylistId } from './lib/types'
import './App.css'

const PLAYLIST_IDS: PlaylistId[] = ['today', 'tomorrow', 'week']

export default function App() {
  const store = useLanaStore()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [openSignal, setOpenSignal] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpenSignal((n) => n + 1)
      }
      if (meta && e.key.toLowerCase() === 'f' && !isEditable(e.target)) {
        // keep native find; our search is always visible
      }
      if (e.key === '/' && !isEditable(e.target)) {
        e.preventDefault()
        const el = document.getElementById('lana-search')
        el?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

    const taskId =
      activeData?.taskId ?? parseDragTaskId(String(active.id))

    const overPlaylist = resolvePlaylistTarget(String(over.id), overData)
    const fromPlaylist =
      activeData?.from && activeData.from !== 'list'
        ? activeData.from
        : findPlaylistContaining(store.state.playlists, taskId)

    // Dropped on a playlist drop zone or item inside a playlist
    if (overPlaylist) {
      if (fromPlaylist === overPlaylist) {
        const ids = store.state.playlists[overPlaylist]
        const oldIndex = ids.indexOf(taskId)
        const overTaskId = String(over.id).startsWith('drop-')
          ? null
          : (overData?.taskId ?? parseDragTaskId(String(over.id)))
        const newIndex = overTaskId ? ids.indexOf(overTaskId) : ids.length - 1
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          store.reorderPlaylist(
            overPlaylist,
            arrayMove(ids, oldIndex, newIndex),
          )
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

      store.moveBetweenPlaylists(
        taskId,
        fromPlaylist,
        overPlaylist,
        toIndex,
      )
    }
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="os">
      <div className="os__glow" aria-hidden />
      <header className="os__top">
        <div className="os__identity">
          <p className="os__eyebrow">{dateLabel}</p>
          <h1 className="os__title">Lana OS</h1>
          <p className="os__sub">
            Capture once. Plan by reference. Local-first.
          </p>
        </div>
        <label className="os__search">
          <span className="sr-only">Search tasks</span>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M13 13l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <input
            id="lana-search"
            type="search"
            placeholder="Search…  /"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </header>

      <CaptureBar
        lists={store.state.lists}
        flashes={store.flashes}
        onCapture={store.capture}
        openSignal={openSignal}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="os__grid">
          <div className="os__plan">
            {PLAYLIST_IDS.map((id) => (
              <PlaylistPanel
                key={id}
                playlistId={id}
                state={store.state}
                query={deferredQuery}
                onToggle={store.toggleComplete}
                onDelete={store.deleteTask}
                onListChange={store.setTaskList}
                onTimeChange={store.setTaskTime}
                onRemoveFromPlaylist={store.removeFromPlaylist}
                onToggleCollapsed={store.togglePlaylistCollapsed}
              />
            ))}
          </div>

          <aside className="os__lists">
            <div className="os__lists-head">
              <h2>Context</h2>
              <p>Tasks live here once. Playlists only hold references.</p>
            </div>
            <ContextLists
              state={store.state}
              query={deferredQuery}
              onToggle={store.toggleComplete}
              onDelete={store.deleteTask}
              onListChange={store.setTaskList}
              onAddToPlaylist={store.addToPlaylist}
              onToggleCollapsed={store.toggleListCollapsed}
            />
          </aside>
        </div>

        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
          {activeTask ? (
            <div className="task task--overlay">
              <p className="task__text">{activeTask.text}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <footer className="os__foot">
        <span>Saved in this browser · no account</span>
        <span>Completed tasks clear after 1 hour</span>
      </footer>
    </div>
  )
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable
  )
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
