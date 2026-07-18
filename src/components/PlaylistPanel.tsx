import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import type { AppState, PlaylistId, Task } from '../lib/types'
import { PLAYLIST_META } from '../lib/types'
import { EmptyState } from './EmptyState'
import { TaskRow } from './TaskRow'

type Props = {
  playlistId: PlaylistId
  state: AppState
  query: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onListChange: (id: string, listId: string) => void
  onTimeChange: (id: string, time: string | null) => void
  onRemoveFromPlaylist: (id: string, playlistId: PlaylistId) => void
  onToggleCollapsed: (playlistId: PlaylistId) => void
}

export function PlaylistPanel({
  playlistId,
  state,
  query,
  onToggle,
  onDelete,
  onListChange,
  onTimeChange,
  onRemoveFromPlaylist,
  onToggleCollapsed,
}: Props) {
  const meta = PLAYLIST_META[playlistId]
  const collapsed = state.collapsedPlaylists[playlistId]
  const ids = state.playlists[playlistId]
  const tasks = ids
    .map((id) => state.tasks[id])
    .filter((t): t is Task => Boolean(t))
    .filter((t) => matchesQuery(t, query))

  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${playlistId}`,
    data: { playlistId },
  })

  const showTime = playlistId === 'today' || playlistId === 'tomorrow'

  return (
    <section
      className={`panel playlist ${isOver ? 'is-over' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      ref={setNodeRef}
    >
      <header className="panel__head">
        <button
          type="button"
          className="panel__toggle"
          onClick={() => onToggleCollapsed(playlistId)}
          aria-expanded={!collapsed}
        >
          <span className="chev" aria-hidden>
            {collapsed ? '▸' : '▾'}
          </span>
          <div>
            <h2>{meta.name}</h2>
            <p>{meta.hint}</p>
          </div>
        </button>
        <span className="panel__count">{tasks.length}</span>
      </header>

      {!collapsed && (
        <div className="panel__body">
          {tasks.length === 0 ? (
            <EmptyState
              title={emptyTitle(playlistId)}
              body={emptyBody(playlistId)}
            />
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
                    onListChange={onListChange}
                    onTimeChange={onTimeChange}
                    onRemoveFromPlaylist={onRemoveFromPlaylist}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      )}
    </section>
  )
}

function matchesQuery(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return task.text.toLowerCase().includes(q)
}

function emptyTitle(id: PlaylistId): string {
  if (id === 'today') return 'Today is clear'
  if (id === 'tomorrow') return 'Nothing staged'
  return 'Week is open'
}

function emptyBody(id: PlaylistId): string {
  if (id === 'today') {
    return 'Drag tasks here or capture with “today” / “tonight”.'
  }
  if (id === 'tomorrow') {
    return 'Park work for morning — it rolls into Today automatically.'
  }
  return 'Soft commitments land here when you say “this week”.'
}
