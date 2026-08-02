import { describe, expect, it, vi } from 'vitest'
import { fetchCalendarFeed, isAllowedFeedUrl } from './calendarFeed.js'

describe('isAllowedFeedUrl', () => {
  it('accepts an https calendar address', () => {
    expect(
      isAllowedFeedUrl('https://calendar.google.com/calendar/ical/x/basic.ics'),
    ).toBe(true)
  })

  it('refuses plaintext, local, and malformed addresses', () => {
    expect(isAllowedFeedUrl('http://calendar.google.com/basic.ics')).toBe(false)
    expect(isAllowedFeedUrl('https://localhost/basic.ics')).toBe(false)
    expect(isAllowedFeedUrl('https://127.0.0.1/basic.ics')).toBe(false)
    expect(isAllowedFeedUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedFeedUrl('nonsense')).toBe(false)
  })
})

describe('fetchCalendarFeed', () => {
  it('returns the feed body', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('BEGIN:VCALENDAR', { status: 200 }),
    )
    expect(
      await fetchCalendarFeed('https://example.com/basic.ics', fetchImpl),
    ).toEqual({ ok: true, text: 'BEGIN:VCALENDAR' })
  })

  it('reports an upstream failure without leaking it', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 403 }))
    expect(
      await fetchCalendarFeed('https://example.com/basic.ics', fetchImpl),
    ).toMatchObject({ ok: false, status: 502 })
  })

  it('rejects a disallowed address before fetching', async () => {
    const fetchImpl = vi.fn()
    expect(
      await fetchCalendarFeed('http://example.com/basic.ics', fetchImpl),
    ).toMatchObject({ ok: false, status: 400 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
