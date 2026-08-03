import { useState } from 'react'
import { REMINDER_PRESETS, formatReminder } from '../../lib/commitments'
import { Row } from './Group'
import { Sheet } from './Sheet'

type Props = {
  open: boolean
  minutes: number | null
  onClose: () => void
  onSelect: (minutes: number | null) => void
}

/**
 * The reminder choices, behind one control. A grid of eight chips made the
 * commitment sheet look like a settings screen; almost every commitment wants
 * one of the first few, and the rest is a number of days.
 */
export function ReminderSheet({ open, minutes, onClose, onSelect }: Props) {
  const [customDays, setCustomDays] = useState('3')
  const [customOpen, setCustomOpen] = useState(false)

  const choose = (value: number | null) => {
    onSelect(value)
    onClose()
  }

  return (
    <Sheet open={open} title="Reminder" layer="stacked" onClose={onClose}>
      {REMINDER_PRESETS.map((preset) => (
        <Row
          key={preset.label}
          label={preset.label}
          selected={!customOpen && minutes === preset.minutes}
          onClick={() => choose(preset.minutes)}
        />
      ))}

      {customOpen ? (
        <div className="mos-time-row">
          <label className="mos-inline-field">
            <input
              type="number"
              min="1"
              max="365"
              inputMode="numeric"
              value={customDays}
              aria-label="Days before"
              onChange={(event) => setCustomDays(event.target.value)}
            />
            <span>days before</span>
          </label>
          <button
            type="button"
            className="mos-btn mos-btn--accent"
            onClick={() => choose(Math.max(1, Number(customDays) || 1) * 1440)}
          >
            Set
          </button>
        </div>
      ) : (
        <Row
          label="Custom…"
          hint={
            minutes !== null &&
            !REMINDER_PRESETS.some((preset) => preset.minutes === minutes)
              ? formatReminder(minutes)
              : undefined
          }
          onClick={() => setCustomOpen(true)}
        />
      )}
    </Sheet>
  )
}
