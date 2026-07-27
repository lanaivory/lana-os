import { useEffect, useState } from 'react'
import {
  enablePushNotifications,
  resolvePushUiState,
  syncPushSubscription,
  type PushUiState,
} from '../lib/webPushClient'

export function usePushNotifications() {
  const [state, setState] = useState<PushUiState>('busy')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // Re-POST an existing browser subscription so server KV stays current.
      const synced = await syncPushSubscription()
      if (cancelled) return
      if (synced === 'enabled' || synced === 'denied' || synced === 'needs-install' || synced === 'unsupported') {
        setState(synced)
        return
      }
      const next = await resolvePushUiState()
      if (!cancelled) setState(next)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = async () => {
    setState('busy')
    const next = await enablePushNotifications()
    setState(next)
    return next
  }

  return { state, enable }
}
