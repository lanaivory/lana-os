import { parseTimeMinutes } from './timeFormat.js'
import type { AppState, Commitment, PlaylistId } from './types.js'

/**
 * Commitments are the dated half of the app: a thing with a day, maybe a clock
 * time, and maybe a reminder. Tasks never carry a date, so this is the only
 * place real calendar arithmetic happens.
 *
 * A commitment pulls itself forward as its date nears — into This week inside
 * the horizon, then into Today on the day — instead of being planned by hand.
 */

/** How far ahead a commitment starts showing up in This week. */
export const WEEK_HORIZON_DAYS = 7

/** Anchor used for reminders on a commitment with no clock time. */
export const ALL_DAY_REMINDER_HOUR = 9

/** How stale a missed reminder can be before it is skipped rather than fired. */
export const REMINDER_GRACE_MS = 6 * 60 * 60 * 1000

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type CommitmentPlacement =
  | 'past'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'upcoming'

export type ReminderPreset = {
  /** Minutes before the commitment; `0` fires at the time itself. */
  minutes: number | null
  label: string
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { minutes: null, label: 'None' },
  { minutes: 0, label: 'At time' },
  { minutes: 10, label: '10m before' },
  { minutes: 30, label: '30m before' },
  { minutes: 60, label: '1h before' },
  { minutes: 1440, label: '1 day before' },
  { minutes: 2880, label: '2 days before' },
  { minutes: 10080, label: '7 days before' },
]

export function formatReminder(minutes: number | null): string {
  if (minutes === null) return 'No reminder'
  const preset = REMINDER_PRESETS.find((p) => p.minutes === minutes)
  if (preset && preset.minutes !== null) return preset.label
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return `${days} day${days === 1 ? '' : 's'} before`
  }
  if (minutes % 60 === 0) return `${minutes / 60}h before`
  return `${minutes}m before`
}

/** Local midnight behind a `YYYY-MM-DD` key, or null when malformed. */
export function dateKeyToDate(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

/** Whole days from `todayKey` to `dateKey`; negative when already past. */
export function daysUntil(dateKey: string, todayKey: string): number | null {
  const target = dateKeyToDate(dateKey)
  const today = dateKeyToDate(todayKey)
  if (!target || !today) return null
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function commitmentPlacement(
  commitment: Commitment,
  todayKey: string,
  horizonDays = WEEK_HORIZON_DAYS,
): CommitmentPlacement {
  const diff = daysUntil(commitment.date, todayKey)
  if (diff === null) return 'upcoming'
  if (diff < 0) return 'past'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= horizonDays) return 'week'
  return 'upcoming'
}

/** Date first, then time (untimed last), then title — the agenda's reading order. */
export function sortCommitments(commitments: Commitment[]): Commitment[] {
  return [...commitments].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    const aTime = parseTimeMinutes(a.time)
    const bTime = parseTimeMinutes(b.time)
    if (aTime !== bTime) {
      if (aTime === null) return 1
      if (bTime === null) return -1
      return aTime - bTime
    }
    return a.title.localeCompare(b.title)
  })
}

/**
 * Commitments a planning day should show. Today also carries anything still
 * undone from a past date — an overdue commitment is the last thing to hide.
 */
export function commitmentsForDay(
  state: AppState,
  day: PlaylistId,
  todayKey: string,
  horizonDays = WEEK_HORIZON_DAYS,
): Commitment[] {
  const wanted: Record<PlaylistId, CommitmentPlacement[]> = {
    today: ['past', 'today'],
    tomorrow: ['tomorrow'],
    week: ['past', 'today', 'tomorrow', 'week'],
  }
  return sortCommitments(
    (state.commitments ?? []).filter((commitment) => {
      const placement = commitmentPlacement(commitment, todayKey, horizonDays)
      if (placement === 'past' && commitment.done) return false
      return wanted[day].includes(placement)
    }),
  )
}

/** The Week half of the Calendar agenda. */
export function weekCommitments(
  state: AppState,
  todayKey: string,
  horizonDays = WEEK_HORIZON_DAYS,
): Commitment[] {
  return commitmentsForDay(state, 'week', todayKey, horizonDays)
}

/** The Upcoming half: everything beyond the week horizon. */
export function upcomingCommitments(
  state: AppState,
  todayKey: string,
  horizonDays = WEEK_HORIZON_DAYS,
): Commitment[] {
  return sortCommitments(
    (state.commitments ?? []).filter(
      (commitment) =>
        commitmentPlacement(commitment, todayKey, horizonDays) === 'upcoming',
    ),
  )
}

/**
 * When the commitment itself happens, in epoch ms on the device that owns it.
 * Untimed commitments anchor to the morning so "1 day before" is not midnight.
 */
export function commitmentTimestamp(commitment: Commitment): number | null {
  const date = dateKeyToDate(commitment.date)
  if (!date) return null
  const minutes = parseTimeMinutes(commitment.time)
  if (minutes === null) {
    date.setHours(ALL_DAY_REMINDER_HOUR, 0, 0, 0)
  } else {
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  }
  return date.getTime()
}

/**
 * Absolute moment a reminder should fire, resolved on the device that knows
 * the user's timezone. Stored on the commitment so the server only compares
 * numbers and never has to guess an offset.
 */
export function computeReminderAt(commitment: Commitment): number | null {
  if (commitment.reminderMinutesBefore === null) return null
  const at = commitmentTimestamp(commitment)
  if (at === null) return null
  return at - commitment.reminderMinutesBefore * 60_000
}

/** Keep `reminderAt` in step with the date, time, and reminder choice. */
export function withResolvedReminder(commitment: Commitment): Commitment {
  const reminderAt = computeReminderAt(commitment)
  if (reminderAt === commitment.reminderAt) return commitment
  return { ...commitment, reminderAt }
}

/**
 * Reminders ready to fire right now: due, not already sent, not done, and not
 * so stale that firing would only be noise.
 */
export function dueReminders(
  state: Pick<AppState, 'commitments'>,
  nowMs: number,
  graceMs = REMINDER_GRACE_MS,
): Commitment[] {
  return (state.commitments ?? []).filter((commitment) => {
    if (commitment.done) return false
    if (commitment.reminderSentAt !== null) return false
    const at = commitment.reminderAt ?? computeReminderAt(commitment)
    if (at === null) return false
    return at <= nowMs && at > nowMs - graceMs
  })
}

/** Push body for a fired reminder, e.g. "Dentist checkup · 2:30pm today". */
export function reminderMessage(
  commitment: Commitment,
  todayKey: string,
  formatTime: (time: string | null) => string | null,
): string {
  const when = formatTime(commitment.time)
  const diff = daysUntil(commitment.date, todayKey)
  const day =
    diff === 0
      ? 'today'
      : diff === 1
        ? 'tomorrow'
        : diff !== null && diff > 1
          ? `in ${diff} days`
          : 'overdue'
  return [commitment.title, when, day].filter(Boolean).join(' · ')
}
