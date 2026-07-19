import { useEffect, useRef, useState } from 'react'
import {
  loadConsumedSids,
  markConsumed,
} from '../lib/twilioSids'

export type InboxMessage = {
  sid: string
  body: string
  dateSent: string
}

const POLL_MS = 5_000

/**
 * Poll GET /api/inbox every 5s. New SMS bodies go through the same capture pipeline.
 */
export function useTwilioInbox(
  capture: (raw: string, opts?: { fromText?: boolean }) => void,
) {
  const [connected, setConnected] = useState(false)
  const consumedRef = useRef<Set<string>>(loadConsumedSids())
  const captureRef = useRef(capture)
  captureRef.current = capture

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch('/api/inbox', {
          headers: { Accept: 'application/json' },
        })
        if (cancelled) return

        if (!res.ok) {
          setConnected(false)
          return
        }

        setConnected(true)
        const data = (await res.json()) as unknown
        const messages = Array.isArray(data) ? (data as InboxMessage[]) : []

        // Oldest first so capture order matches SMS chronology.
        const fresh = messages
          .filter((m) => m?.sid && typeof m.body === 'string')
          .filter((m) => !consumedRef.current.has(m.sid))
          .sort((a, b) => {
            const da = Date.parse(a.dateSent) || 0
            const db = Date.parse(b.dateSent) || 0
            return da - db
          })

        for (const msg of fresh) {
          const body = msg.body.trim()
          if (body) {
            captureRef.current(body, { fromText: true })
          }
          consumedRef.current = markConsumed(consumedRef.current, msg.sid)
        }
      } catch {
        if (!cancelled) setConnected(false)
      }
    }

    void poll()
    const id = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return { connected }
}
