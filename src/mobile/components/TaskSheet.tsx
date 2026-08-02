import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { suggestLists } from '../../lib/listSuggest'
import type { TaskLocation } from '../../lib/mobileSelectors'
import type { ContextList, PlaylistId, Task } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { ListPickerSheet } from './ListPickerSheet'
import { Sheet } from './Sheet'

type Props = {
  task: Task | null
  lists: ContextList[]
  location: TaskLocation | null
  /** Lists filed into recently, used to pad thin suggestions. */
  recentListIds: string[]
  onClose: () => void
  onRename: (taskId: string, text: string) => void
  onPlan: (taskId: string, day: PlaylistId | null) => void
  onTimeChange: (taskId: string, time: string | null) => void
  onListChange: (taskId: string, listId: string) => void
  onDelete: (taskId: string) => void
}

const WHEN_LABELS: Record<PlaylistId, string> = {
  today: PLAYLIST_META.today.name,
  tomorrow: PLAYLIST_META.tomorrow.name,
  week: 'This week',
}

/**
 * Capture and edit in one lean sheet: what it is, where it lives, when it
 * happens. Every control writes straight through, so closing is saving and
 * there is no Save button to hunt for. The title is not focused on open — the
 * text is usually already right, and a keyboard would cover the rest.
 */
export function TaskSheet({
  task,
  lists,
  location,
  recentListIds,
  onClose,
  onRename,
  onPlan,
  onTimeChange,
  onListChange,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(task?.text ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitle(task?.text ?? '')
  }, [task?.id, task?.text])

  const suggestions = useMemo(() => {
    if (!task) return []
    const byId = new Map(lists.map((list) => [list.id, list]))
    return suggestLists(task.text, {
      lists,
      currentListId: task.listId,
      recentListIds,
    }).flatMap((listId) => {
      const list = byId.get(listId)
      return list ? [list] : []
    })
  }, [task, lists, recentListIds])

  if (!task) return null

  const day = location?.kind === 'agenda' ? location.day : null

  const commitTitle = () => {
    const next = title.trim()
    if (next && next !== task.text) onRename(task.id, next)
    else if (!next) setTitle(task.text)
  }

  const close = () => {
    commitTitle()
    onClose()
  }

  return (
    <Sheet open title="Task" onClose={close}>
      <form
        className="mos-sheet__title-form"
        onSubmit={(event) => {
          event.preventDefault()
          commitTitle()
          inputRef.current?.blur()
        }}
      >
        <input
          ref={inputRef}
          className="mos-sheet__title-input"
          value={title}
          aria-label="Task title"
          enterKeyHint="done"
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
        />
      </form>

      <div className="mos-field-block">
        <span className="mos-field-block__label">List</span>
        <div className="mos-chiprow">
          {suggestions.map((list) => (
            <button
              key={list.id}
              type="button"
              className={`mos-listchip${list.id === task.listId ? ' is-active' : ''}`}
              style={{ '--tag': list.color } as CSSProperties}
              aria-pressed={list.id === task.listId}
              onClick={() => onListChange(task.id, list.id)}
            >
              {list.name}
            </button>
          ))}
          <button
            type="button"
            className="mos-listchip mos-listchip--more"
            onClick={() => setPickerOpen(true)}
          >
            More…
          </button>
        </div>
      </div>

      <div className="mos-field-block">
        <span className="mos-field-block__label">When</span>
        <div className="mos-segments mos-segments--three">
          {PLAYLIST_CARD_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`mos-segment${day === id ? ' is-active' : ''}`}
              aria-pressed={day === id}
              onClick={() => onPlan(task.id, day === id ? null : id)}
            >
              {WHEN_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="mos-field-block">
        <span className="mos-field-block__label">Time</span>
        <div className="mos-time-row">
          <input
            type="time"
            className="mos-time-input"
            value={task.time ?? ''}
            aria-label="Time"
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
      </div>

      <button
        type="button"
        className="mos-quiet-danger"
        onClick={() => onDelete(task.id)}
      >
        Delete task
      </button>

      <ListPickerSheet
        open={pickerOpen}
        lists={lists}
        selectedId={task.listId}
        onClose={() => setPickerOpen(false)}
        onSelect={(listId) => onListChange(task.id, listId)}
      />
    </Sheet>
  )
}
