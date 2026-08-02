/**
 * Just enough iCalendar to render someone else's calendar read-only.
 * Google Calendar's "secret address in iCal format" is the supported input;
 * nothing here ever writes back, so only DTSTART and SUMMARY matter.
 */

export type FeedEvent = {
  uid: string
  title: string
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string
  /** Local `HH:MM`, or null for an all-day event. */
  time: string | null
}

/** Rejoin RFC 5545 folded lines (a continuation starts with space or tab). */
export function unfoldIcs(text: string): string[] {
  const lines: string[] = []
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1)
      continue
    }
    lines.push(raw)
  }
  return lines
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localParts(date: Date): { date: string; time: string } {
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

/**
 * Turn a DTSTART value into a local date (+ time when the event is not all-day).
 * `...Z` values are UTC instants and get converted to this device's clock;
 * floating and TZID values are read as-is, which is what a calendar app shows.
 */
export function parseIcsDate(
  params: string,
  value: string,
): { date: string; time: string | null } | null {
  const raw = value.trim()
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
  if (dateOnly) {
    return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: null }
  }
  if (/VALUE=DATE(?!-TIME)/i.test(params)) return null

  const stamp = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(raw)
  if (!stamp) return null

  const [, year, month, day, hour, minute, second, zulu] = stamp
  if (zulu) {
    const utc = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    )
    const parts = localParts(utc)
    return { date: parts.date, time: parts.time }
  }
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` }
}

/** Every VEVENT with a usable start, oldest first. */
export function parseIcsEvents(text: string): FeedEvent[] {
  const events: FeedEvent[] = []
  let current: Partial<FeedEvent> | null = null

  for (const line of unfoldIcs(text)) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (trimmed === 'END:VEVENT') {
      if (current?.date && current.title) {
        events.push({
          uid: current.uid || `${current.date}-${current.title}`,
          title: current.title,
          date: current.date,
          time: current.time ?? null,
        })
      }
      current = null
      continue
    }
    if (!current) continue

    const colon = trimmed.indexOf(':')
    if (colon === -1) continue
    const head = trimmed.slice(0, colon)
    const value = trimmed.slice(colon + 1)
    const [name, ...paramParts] = head.split(';')
    const key = name.toUpperCase()

    if (key === 'SUMMARY') current.title = unescapeText(value)
    else if (key === 'UID') current.uid = value.trim()
    else if (key === 'DTSTART') {
      const parsed = parseIcsDate(paramParts.join(';'), value)
      if (parsed) {
        current.date = parsed.date
        current.time = parsed.time
      }
    }
  }

  return events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
  })
}

/** Feed events inside `[fromKey, toKey]`, ready to merge into the agenda. */
export function feedEventsBetween(
  events: FeedEvent[],
  fromKey: string,
  toKey: string,
): FeedEvent[] {
  return events.filter((event) => event.date >= fromKey && event.date <= toKey)
}
