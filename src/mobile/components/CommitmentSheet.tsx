import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { REMINDER_PRESETS, formatReminder } from '../../lib/commitments'
import { suggestLists } from '../../lib/listSuggest'
import type { Commitment, ContextList } from '../../lib/types'
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
  const [customDays, setCustomDays] = useState('3')
  const [customOpen, setCustomOpen] = useState(false)
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
    const minutes = current?.reminderMinutesBefore ?? null
    const preset = REMINDER_PRESETS.some((p) => p.minutes === minutes)
    setCustomOpen(!preset)
    if (!preset && minutes !== null) {
      setCustomDays(String(Math.max(1, Math.round(minutes / 1440))))
    }
  }, [open, commitmentId, defaultDate])

  const suggestions = useMemo(() => {
    const byId = new Map(lists.map((list) => [list.id, list]))
    return suggestLists(title, { lists, currentListId: listId }).flatMap((id) => {
      const list = byId.get(id)
      return list ? [list] : []
    })
  }, [lists, title, listId])

  const canSave = title.trim().length > 0 && Boolean(date)

  /** Closing is saving; an empty draft is simply discarded. */
  const save = () => {
    if (canSave) {
      onSave({
        title: title.trim(),
        date,
        time: time || null,
        reminderMinutesBefore: reminder,
        listId,
      })
    }
    onClose()
  }

  return (
    <Sheet
      open={open}
      title={commitment ? 'Commitment' : 'New commitment'}
      onClose={save}
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
        <div className="mos-chiprow">
          {REMINDER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`mos-listchip${
                !customOpen && reminder === preset.minutes ? ' is-active' : ''
              }`}
              aria-pressed={!customOpen && reminder === preset.minutes}
              onClick={() => {
                setCustomOpen(false)
                setReminder(preset.minutes)
              }}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className={`mos-listchip${customOpen ? ' is-active' : ''}`}
            aria-pressed={customOpen}
            onClick={() => {
              setCustomOpen(true)
              setReminder(Math.max(1, Number(customDays) || 1) * 1440)
            }}
          >
            Custom
          </button>
        </div>

        {customOpen && (
          <label className="mos-inline-field">
            <input
              type="number"
              min="1"
              max="365"
              inputMode="numeric"
              value={customDays}
              aria-label="Days before"
              onChange={(event) => {
                setCustomDays(event.target.value)
                const days = Math.max(1, Number(event.target.value) || 1)
                setReminder(days * 1440)
              }}
            />
            <span>days before</span>
          </label>
        )}

        <p className="mos-note">
          {reminder === null
            ? 'No reminder.'
            : `${formatReminder(reminder)} — sent as a phone notification.`}
          {reminder !== null && !pushEnabled
            ? ' Turn on notifications in Settings to receive it.'
            : ''}
        </p>
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

      {commitment && onDelete && (
        <button
          type="button"
          className="mos-quiet-danger"
          onClick={() => {
            onDelete(commitment.id)
            onClose()
          }}
        >
          Delete commitment
        </button>
      )}
    </Sheet>
  )
}
