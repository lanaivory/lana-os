import { agendaTasks } from './mobileSelectors'
import { formatPlanTime } from './timeFormat'
import type { AppState, PlaylistId, Task } from './types'

/**
 * Calendar day view. The board has no dates — only the Today / Tomorrow
 * playlists and an optional `HH:MM` on each task — so a day's timeline is
 * derived: planned tasks with a time land in their hour, the rest sit in an
 * unscheduled tray above the clock.
 */

/** Hours always rendered, so an empty day still looks like a day. */
export const DEFAULT_DAY_START_HOUR = 7
export const DEFAULT_DAY_END_HOUR = 21

export type CalendarHour = {
  hour: number
  tasks: Task[]
}

export type DaySchedule = {
  hours: CalendarHour[]
  /** Planned into the day with no time set. */
  untimed: Task[]
  timedCount: number
}

export type NowMarker = {
  hour: number
  /** How far through that hour we are, 0–1, for positioning the line. */
  fraction: number
}

/** Minutes since midnight for an `HH:MM` value, or null when unusable. */
export function parseTimeMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const [rawHours, rawMinutes] = time.split(':')
  const hours = Number(rawHours)
  const minutes = Number(rawMinutes)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export function hourOfTime(time: string | null | undefined): number | null {
  const minutes = parseTimeMinutes(time)
  return minutes === null ? null : Math.floor(minutes / 60)
}

/** `HH:MM` for the top of an hour, ready for an `<input type="time">`. */
export function hourTimeValue(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatHourLabel(hour: number): string {
  return formatPlanTime(hourTimeValue(hour)) ?? ''
}

/**
 * Hours to render: the default working window, widened to hold every timed
 * task and (for today) the current hour.
 */
export function calendarWindow(
  tasks: Task[],
  opts: { nowHour?: number } = {},
): { start: number; end: number } {
  let start = DEFAULT_DAY_START_HOUR
  let end = DEFAULT_DAY_END_HOUR

  const stretch = (hour: number) => {
    start = Math.min(start, hour)
    end = Math.max(end, hour)
  }

  for (const task of tasks) {
    const hour = hourOfTime(task.time)
    if (hour !== null) stretch(hour)
  }
  if (opts.nowHour !== undefined) stretch(opts.nowHour)

  return { start, end }
}

/** Timeline for one planning day, hour by hour. */
export function daySchedule(
  state: AppState,
  day: PlaylistId,
  opts: { nowHour?: number } = {},
): DaySchedule {
  const planned = agendaTasks(state, day)
  const { start, end } = calendarWindow(planned, opts)

  const hours: CalendarHour[] = []
  for (let hour = start; hour <= end; hour++) hours.push({ hour, tasks: [] })

  const untimed: Task[] = []
  let timedCount = 0

  for (const task of planned) {
    const hour = hourOfTime(task.time)
    if (hour === null) {
      untimed.push(task)
      continue
    }
    timedCount += 1
    hours[hour - start].tasks.push(task)
  }

  for (const slot of hours) {
    if (slot.tasks.length < 2) continue
    slot.tasks.sort(
      (a, b) => (parseTimeMinutes(a.time) ?? 0) - (parseTimeMinutes(b.time) ?? 0),
    )
  }

  return { hours, untimed, timedCount }
}

/** Where to draw the "now" line, or null when the clock is off the window. */
export function nowMarker(date: Date, hours: CalendarHour[]): NowMarker | null {
  if (hours.length === 0) return null
  const hour = date.getHours()
  const first = hours[0].hour
  const last = hours[hours.length - 1].hour
  if (hour < first || hour > last) return null
  return { hour, fraction: date.getMinutes() / 60 }
}

/** Real date behind a planning day. This Week spans days, so it has none. */
export function dayDate(day: PlaylistId, now: Date): Date | null {
  if (day === 'week') return null
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  if (day === 'tomorrow') date.setDate(date.getDate() + 1)
  return date
}
