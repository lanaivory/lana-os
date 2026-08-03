import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { formatReminder } from '../../lib/commitments'
import { suggestLists } from '../../lib/listSuggest'
import type { Commitment, ContextList } from '../../lib/types'
import { ReminderSheet } from './ReminderSheet'
import { Sheet } from './Sheet'

export type CommitmentDraft = {
  title: string
  date: string
  time: string | null
  reminderMinutesBefore: number | null
  listId: string | null
}

type Props = {
  open: boolean
  /** Null when adding. */
  commitment: Commitment | null
  lists: ContextList[]
  /** Pre-filled date when adding, `YYYY-MM-DD`. */
  defaultDate: string
  pushEnabled: boolean
  onClose: () => void
  onSave: (draft: CommitmentDraft) => void
  onDelete?: (id: string) => void
}

/**
 * Add or edit a dated commitment. Reminders fire as a web push on this device,
 * never as a text — the number is for capture in, not nagging out.
 */
export function CommitmentSheet({
  open,
  commitment,
  lists,
  defaultDate,
  pushEnabled,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [reminder, setReminder] = useState<number | null>(null)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [listId, setListId] = useState<string | null>(null)

  // A cloud poll replaces the commitment object every few seconds, so the
  // draft is seeded by identity only — otherwise a sync would erase typing.
  const editing = useRef(commitment)
  editing.current = commitment
  const commitmentId = commitment?.id ?? null

  useEffect(() => {
    if (!open) return
    const current = editing.current
    setTitle(current?.title ?? '')
    setDate(current?.date ?? defaultDate)
    setTime(current?.time ?? '')
    setReminder(current?.reminderMinutesBefore ?? null)
    setListId(current?.listId ?? null)
    setReminderOpen(false)
  }, [open, commitmentId, defaultDate])

  const suggestions = useMemo(() => {
    const byId = new Map(lists.map((list) => [list.id, list]))
    return suggestLists(title, { lists, currentListId: listId }).flatMap((id) => {
      const list = byId.get(id)
      return list ? [list] : []
    })
  }, [lists, title, listId])

  const canSave = title.trim().length > 0 && Boolean(date)

  const save = () => {
    if (!canSave) return
    onSave({
      title: title.trim(),
      date,
      time: time || null,
      reminderMinutesBefore: reminder,
      listId,
    })
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={commitment ? 'Commitment' : 'New commitment'}
      onClose={onClose}
      footer={
        <>
          {commitment && onDelete ? (
            <button
              type="button"
              className="mos-btn mos-btn--danger"
              onClick={() => {
                onDelete(commitment.id)
                onClose()
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="mos-btn mos-btn--accent"
            disabled={!canSave}
            onClick={save}
          >
            Save
          </button>
        </>
      }
    >
      <form
        className="mos-sheet__title-form"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <input
          className="mos-sheet__title-input"
          value={title}
          placeholder="What is it?"
          aria-label="Commitment title"
          enterKeyHint="done"
          onChange={(event) => setTitle(event.target.value)}
        />
      </form>

      <div className="mos-field-block">
        <span className="mos-field-block__label">When</span>
        <div className="mos-time-row">
          <input
            type="date"
            className="mos-time-input"
            value={date}
            aria-label="Date"
            onChange={(event) => setDate(event.target.value)}
          />
          <input
            type="time"
            className="mos-time-input"
            value={time}
            aria-label="Time (optional)"
            onChange={(event) => setTime(event.target.value)}
          />
        </div>
      </div>

      <div className="mos-field-block">
        <span className="mos-field-block__label">Reminder</span>
        <button
          type="button"
          className="mos-picker-btn"
          onClick={() => setReminderOpen(true)}
        >
          <span>{formatReminder(reminder)}</span>
          <span className="mos-picker-btn__hint">Change</span>
        </button>
        {reminder !== null && !pushEnabled && (
          <p className="mos-note">
            Turn on notifications in Settings to receive it.
          </p>
        )}
      </div>

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
              onClick={() => setListId(list.id === listId ? null : list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>
      </div>

      <ReminderSheet
        open={reminderOpen}
        minutes={reminder}
        onClose={() => setReminderOpen(false)}
        onSelect={setReminder}
      />
    </Sheet>
  )
}
