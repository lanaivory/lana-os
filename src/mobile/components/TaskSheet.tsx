import { useEffect, useState, type CSSProperties } from 'react'
import { PLAYLIST_CARD_IDS } from '../../lib/board'
import type { TaskLocation } from '../../lib/mobileSelectors'
import type { ContextList, PlaylistId, Task } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { Group, Row } from './Group'
import { Sheet } from './Sheet'
import { ArrowIcon } from './icons'

type Props = {
  task: Task | null
  lists: ContextList[]
  location: TaskLocation | null
  canMoveUp: boolean
  canMoveDown: boolean
  /** Manual ordering is meaningless while a list is sorted A–Z or by date. */
  canReorder: boolean
  onClose: () => void
  onRename: (taskId: string, text: string) => void
  onPlan: (taskId: string, day: PlaylistId | null) => void
  onTimeChange: (taskId: string, time: string | null) => void
  onListChange: (taskId: string, listId: string) => void
  onMove: (taskId: string, direction: -1 | 1) => void
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
}

export function TaskSheet({
  task,
  lists,
  location,
  canMoveUp,
  canMoveDown,
  canReorder,
  onClose,
  onRename,
  onPlan,
  onTimeChange,
  onListChange,
  onMove,
  onToggleComplete,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(task?.text ?? '')

  useEffect(() => {
    setTitle(task?.text ?? '')
  }, [task?.id, task?.text])

  if (!task) return null

  const day = location?.kind === 'agenda' ? location.day : null
  const commitTitle = () => {
    const next = title.trim()
    if (next && next !== task.text) onRename(task.id, next)
    else setTitle(task.text)
  }

  return (
    <Sheet open title="Task" onClose={onClose}>
      <form
        className="mos-sheet__title-form"
        onSubmit={(event) => {
          event.preventDefault()
          commitTitle()
        }}
      >
        <input
          className="mos-sheet__title-input"
          value={title}
          aria-label="Task title"
          enterKeyHint="done"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
        />
      </form>

      <Group label="Plan">
        <div className="mos-segments">
          {PLAYLIST_CARD_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`mos-segment${day === id ? ' is-active' : ''}`}
              aria-pressed={day === id}
              onClick={() => onPlan(task.id, day === id ? null : id)}
            >
              {PLAYLIST_META[id].name}
            </button>
          ))}
          <button
            type="button"
            className={`mos-segment${day === null ? ' is-active' : ''}`}
            aria-pressed={day === null}
            onClick={() => onPlan(task.id, null)}
          >
            Unplanned
          </button>
        </div>
      </Group>

      {(day === 'today' || day === 'tomorrow') && (
        <Group label="Time">
          <div className="mos-time-row">
            <input
              type="time"
              className="mos-time-input"
              value={task.time ?? ''}
              aria-label="Planned time"
              onChange={(event) =>
                onTimeChange(task.id, event.target.value || null)
              }
            />
            {task.time && (
              <button
                type="button"
                className="mos-chip"
                onClick={() => onTimeChange(task.id, null)}
              >
                Clear
              </button>
            )}
          </div>
        </Group>
      )}

      <Group label="List">
        <div className="mos-tag-grid">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className={`mos-tag${list.id === task.listId ? ' is-active' : ''}`}
              style={{ '--tag': list.color } as CSSProperties}
              aria-pressed={list.id === task.listId}
              onClick={() => onListChange(task.id, list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>
      </Group>

      {canReorder && (
        <Group label="Order">
          <div className="mos-order-row">
            <button
              type="button"
              className="mos-chip"
              disabled={!canMoveUp}
              onClick={() => onMove(task.id, -1)}
            >
              <ArrowIcon direction="up" />
              Move up
            </button>
            <button
              type="button"
              className="mos-chip"
              disabled={!canMoveDown}
              onClick={() => onMove(task.id, 1)}
            >
              <ArrowIcon direction="down" />
              Move down
            </button>
          </div>
        </Group>
      )}

      <Group>
        <Row
          label={task.completed ? 'Mark as not done' : 'Mark as done'}
          onClick={() => onToggleComplete(task.id)}
        />
        <Row
          label="Delete task"
          hint="Recoverable for 24 hours"
          tone="danger"
          onClick={() => onDelete(task.id)}
        />
      </Group>
    </Sheet>
  )
}
