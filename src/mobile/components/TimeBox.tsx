import { formatPlanTime } from '../../lib/timeFormat'

type Props = {
  time: string | null
  /** Omit to render a read-only stamp. */
  onChange?: (time: string | null) => void
  label?: string
}

/**
 * The boxed monospace time. On a Playlist row it is always present — a quiet
 * dash when there is no time — so the left edge of every row lines up and a
 * time is one tap away rather than a trip through the edit sheet.
 *
 * The native picker is driven by a transparent input laid over the box, which
 * keeps the box's own look while giving the platform's own time UI.
 */
export function TimeBox({ time, onChange, label = 'Time' }: Props) {
  const shown = formatPlanTime(time)
  const empty = !shown

  // A stamp with nothing to stamp is just an empty box.
  if (!onChange) {
    return shown ? <span className="mos-time-box">{shown}</span> : null
  }

  return (
    <span className={`mos-time-box mos-time-box--set${empty ? ' is-empty' : ''}`}>
      <span aria-hidden>{shown ?? '–'}</span>
      <input
        type="time"
        className="mos-time-box__input"
        value={time ?? ''}
        aria-label={label}
        onChange={(event) => onChange(event.target.value || null)}
        onClick={(event) => {
          const input = event.currentTarget
          try {
            input.showPicker?.()
          } catch {
            // Not allowed on this browser; focusing the field still works.
          }
        }}
      />
    </span>
  )
}
