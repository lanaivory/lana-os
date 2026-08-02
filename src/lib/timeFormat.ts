/**
 * Compact 12-hour label for an `HH:MM` planning time — "7am", "7:45am".
 * Returns null for empty or malformed values so callers can skip the chip.
 */
export function formatPlanTime(value: string | null | undefined): string | null {
  if (!value) return null
  const [rawHours, rawMinutes] = value.split(':')
  const hours = Number(rawHours)
  const minutes = Number(rawMinutes)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  const suffix = hours < 12 ? 'am' : 'pm'
  const hour12 = hours % 12 || 12
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`
}
