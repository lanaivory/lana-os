import { describe, expect, it } from 'vitest'
import { feedEventsBetween, parseIcsDate, parseIcsEvents, unfoldIcs } from './ics'

describe('unfoldIcs', () => {
  it('rejoins continuation lines', () => {
    expect(unfoldIcs('SUMMARY:Long\r\n  tail\r\nUID:1')).toEqual([
      'SUMMARY:Long tail',
      'UID:1',
    ])
  })
})

describe('parseIcsDate', () => {
  it('reads an all-day value', () => {
    expect(parseIcsDate('VALUE=DATE', '20260803')).toEqual({
      date: '2026-08-03',
      time: null,
    })
  })

  it('reads a floating local timestamp as written', () => {
    expect(parseIcsDate('TZID=Europe/London', '20260803T143000')).toEqual({
      date: '2026-08-03',
      time: '14:30',
    })
  })

  it('converts a UTC instant to this device clock', () => {
    const parsed = parseIcsDate('', '20260803T143000Z')
    const local = new Date(Date.UTC(2026, 7, 3, 14, 30))
    expect(parsed?.time).toBe(
      `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`,
    )
  })

  it('ignores junk', () => {
    expect(parseIcsDate('', 'tomorrow')).toBeNull()
  })
})

const FEED = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:2@example.com
SUMMARY:Later thing
DTSTART;VALUE=DATE:20260810
END:VEVENT
BEGIN:VEVENT
UID:1@example.com
SUMMARY:Standup\\, daily
DTSTART;TZID=Europe/London:20260803T093000
END:VEVENT
BEGIN:VEVENT
SUMMARY:No start
END:VEVENT
END:VCALENDAR`

describe('parseIcsEvents', () => {
  it('reads events in date order and unescapes titles', () => {
    const events = parseIcsEvents(FEED)
    expect(events.map((e) => e.uid)).toEqual(['1@example.com', '2@example.com'])
    expect(events[0]).toMatchObject({
      title: 'Standup, daily',
      date: '2026-08-03',
      time: '09:30',
    })
    expect(events[1].time).toBeNull()
  })

  it('drops events without a usable start', () => {
    expect(parseIcsEvents(FEED).some((e) => e.title === 'No start')).toBe(false)
  })

  it('survives an empty or broken feed', () => {
    expect(parseIcsEvents('')).toEqual([])
    expect(parseIcsEvents('not a calendar at all')).toEqual([])
  })
})

describe('feedEventsBetween', () => {
  it('keeps the inclusive window', () => {
    const events = parseIcsEvents(FEED)
    expect(
      feedEventsBetween(events, '2026-08-03', '2026-08-05').map((e) => e.title),
    ).toEqual(['Standup, daily'])
  })
})
