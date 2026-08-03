import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { PLAYLIST_CARD_IDS } from '../../lib/board'
import { suggestLists } from '../../lib/listSuggest'
import type { TaskLocation } from '../../lib/mobileSelectors'
import type { ContextList, PlaylistId, Task } from '../../lib/types'
import { PLAYLIST_META } from '../../lib/types'
import { ListPickerSheet } from './ListPickerSheet'
import { Sheet } from './Sheet'
import { TimeBox } from './TimeBox'

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
 * Edit in one lean sheet: the time boxed beside the title, where it lives,
 * and when it happens. The sheet holds a draft — Save commits it, the X walks
 * away — and it does not take the keyboard on open, because the text it is
 * showing you is usually already right.
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
  const [title, setTitle] = useState('')
  const [time, setTime] = useState<string | null>(null)
  const [listId, setListId] = useState<string | null>(null)
  const [day, setDay] = useState<PlaylistId | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const taskId = task?.id ?? null
  const openDay = location?.kind === 'agenda' ? location.day : null

  // Seeded per task, not per keystroke from the store: a cloud poll landing
  // mid-edit must not overwrite what is being typed.
  const seed = useRef({ task, openDay })
  seed.current = { task, openDay }

  useEffect(() => {
    if (!taskId) return
    const { task: current, openDay: currentDay } = seed.current
    setTitle(current?.text ?? '')
    setTime(current?.time ?? null)
    setListId(current?.listId ?? null)
    setDay(currentDay)
    setPickerOpen(false)
  }, [taskId])

  const suggestions = useMemo(() => {
    if (!task) return []
    const byId = new Map(lists.map((list) => [list.id, list]))
    return suggestLists(task.text, {
      lists,
      currentListId: listId ?? task.listId,
      recentListIds,
    }).flatMap((id) => {
      const list = byId.get(id)
      return list ? [list] : []
    })
  }, [task, lists, listId, recentListIds])

  if (!task) return null

  const save = () => {
    const next = title.trim()
    if (next && next !== task.text) onRename(task.id, next)
    if (time !== task.time) onTimeChange(task.id, time)
    if (listId && listId !== task.listId) onListChange(task.id, listId)
    if (day !== openDay) onPlan(task.id, day)
    onClose()
  }

  return (
    <Sheet
      open
      title="Task"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="mos-btn mos-btn--danger"
            onClick={() => onDelete(task.id)}
          >
            Delete
          </button>
          <button type="button" className="mos-btn mos-btn--accent" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <form
        className="mos-titlerow"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <TimeBox time={time} onChange={setTime} />
        <input
          className="mos-sheet__title-input"
          value={title}
          aria-label="Task title"
          enterKeyHint="done"
          onChange={(event) => setTitle(event.target.value)}
        />
      </form>

      <div className="mos-field-block">
        <span className="mos-field-block__label">List</span>
        <div className="mos-chiprow">
          {suggestions.map((list) => (
            <button
              key={list.id}
              type="button"
              className={`mos-listchip${list.id === listId ? ' is-active' : ''}`}
              style={{ '--tag': list.color } as CSSProperties}
              aria-pressed={list.id === listId}
              onClick={() => setListId(list.id)}
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
              onClick={() => setDay(day === id ? null : id)}
            >
              {WHEN_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <ListPickerSheet
        open={pickerOpen}
        lists={lists}
        selectedId={listId}
        onClose={() => setPickerOpen(false)}
        onSelect={setListId}
      />
    </Sheet>
  )
}
