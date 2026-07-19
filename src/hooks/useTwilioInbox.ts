import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadConsumedSids,
  markConsumed,
} from '../lib/twilioSids'

export type InboxMessage = {
  sid: string
  body: string
  dateSent: string
}

/** Background poll interval — on-demand "Check now" is separate. */
const POLL_MS = 2 * 60_000

/**
 * Poll GET /api/inbox every 2 minutes. New SMS bodies go through the same capture pipeline.
 * Exposes checkNow() for an immediate pull from the header.
 */
export function useTwilioInbox(
  capture: (raw: string, opts?: { fromText?: boolean }) => void,
) {
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(false)
  const consumedRef = useRef<Set<string>>(loadConsumedSids())
  const captureRef = useRef(capture)
  captureRef.current = capture
  const inFlightRef = useRef<Promise<void> | null>(null)

  const pollOnce = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current

    const run = (async () => {
      try {
        const res = await fetch('/api/inbox', {
          headers: { Accept: 'application/json' },
        })

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
        setConnected(false)
      }
    })()

    inFlightRef.current = run.finally(() => {
      inFlightRef.current = null
    })
    return inFlightRef.current
  }, [])

  const checkNow = useCallback(async () => {
    setChecking(true)
    try {
      await pollOnce()
    } finally {
      setChecking(false)
    }
  }, [pollOnce])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      await pollOnce()
    }

    void tick()
    const id = window.setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pollOnce])

  return { connected, checking, checkNow }
}
