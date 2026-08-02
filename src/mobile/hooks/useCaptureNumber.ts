import { useEffect, useState } from 'react'
import { fetchCaptureNumber } from '../../lib/captureNumber'

/**
 * The inbound number to text. The server knows it from the Twilio config; the
 * manual override wins for deployments that route texts some other way.
 */
export function useCaptureNumber(override: string): string {
  const [fromServer, setFromServer] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetchCaptureNumber().then((number) => {
      if (!cancelled) setFromServer(number)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return override.trim() || fromServer
}
