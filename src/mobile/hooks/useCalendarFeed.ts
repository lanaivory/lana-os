import { useEffect, useState } from 'react'
import { parseIcsEvents, type FeedEvent } from '../../lib/ics'
import type { FeedStatus } from '../screens/CalendarScreen'

const REFRESH_MS = 30 * 60 * 1000

/**
 * Read-only view of an external calendar. The feed is fetched through the
 * server (browsers will not read a cross-origin .ics directly) and nothing is
 * ever written back.
 */
export function useCalendarFeed(url: string): {
  events: FeedEvent[]
  status: FeedStatus
} {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [status, setStatus] = useState<FeedStatus>('off')

  useEffect(() => {
    const feed = url.trim()
    if (!feed) {
      setEvents([])
      setStatus('off')
      return
    }

    let cancelled = false
    const load = async () => {
      setStatus((prev) => (prev === 'ok' ? prev : 'loading'))
      try {
        const res = await fetch(`/api/gcal?url=${encodeURIComponent(feed)}`, {
          headers: { Accept: 'text/calendar' },
        })
        if (!res.ok) throw new Error(String(res.status))
        const text = await res.text()
        if (cancelled) return
        setEvents(parseIcsEvents(text))
        setStatus('ok')
      } catch {
        if (cancelled) return
        setEvents([])
        setStatus('error')
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [url])

  return { events, status }
}
