import { formatPlanTime } from '../../lib/timeFormat'

type Props = {
  time: string | null
  /** Omit to render a read-only stamp. */
  onChange?: (time: string | null) => void
  /**
   * Keep the column even with nothing to show. A read-only run of rows — the
   * completed fold, the calendar's feed events — stays lined up with the rows
   * above it this way.
   */
  hold?: boolean
  label?: string
}

/**
 * The time on the left of a row. A time that is set reads as a small chip in
 * the row's own text colour, so "this happens at a time" is unmistakable at a
 * glance; an empty slot stays a faint dash, which is somewhere to put a time
 * rather than something to read.
 *
 * The column holds a fixed width either way, so the left edge of every title on
 * a day lines up. The native picker is driven by a transparent input laid over
 * the chip, which is also what gives it a full-height tap target.
 */
export function TimeBox({ time, onChange, hold = false, label = 'Time' }: Props) {
  const shown = formatPlanTime(time)

  if (!onChange) {
    if (shown) return <span className="mos-time-box has-time">{shown}</span>
    // Empty and unsettable: hold the column, or take up no room at all.
    return hold ? <span className="mos-time-box" aria-hidden /> : null
  }

  return (
    <span
      className={`mos-time-box mos-time-box--set${shown ? ' has-time' : ' is-empty'}`}
    >
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
