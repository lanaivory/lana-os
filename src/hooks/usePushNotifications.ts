import { useEffect, useState } from 'react'
import {
  enablePushNotifications,
  resolvePushUiState,
  type PushUiState,
} from '../lib/webPushClient'

export function usePushNotifications() {
  const [state, setState] = useState<PushUiState>('busy')

  useEffect(() => {
    let cancelled = false
    void resolvePushUiState().then((next) => {
      if (!cancelled) setState(next)
    })
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
