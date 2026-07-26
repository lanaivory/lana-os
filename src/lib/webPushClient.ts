import { loadPasscode } from './passcode'

export type PushUiState =
  | 'unsupported'
  | 'needs-install'
  | 'default'
  | 'enabled'
  | 'denied'
  | 'busy'

function passHeaders(): HeadersInit {
  const pass = loadPasscode()
  return pass ? { 'x-app-pass': pass } : {}
}

/** Convert a URL-safe base64 VAPID key to Uint8Array for PushManager. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i)
  }
  return out
}

/** True when running as an installed PWA (required for iOS web push). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone,
  )
  return Boolean(mq || iosStandalone)
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * iOS only exposes Web Push inside a home-screen (standalone) PWA.
 * On other platforms, browser tabs are fine.
 */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS = /iPad|iPhone|iPod/.test(ua)
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOS || iPadOs
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push-public-key', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { publicKey?: unknown }
    return typeof data.publicKey === 'string' && data.publicKey.trim()
      ? data.publicKey.trim()
      : null
  } catch {
    return null
  }
}

export async function postPushSubscribe(
  subscription: PushSubscriptionJSON,
): Promise<boolean> {
  try {
    const res = await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...passHeaders(),
      },
      body: JSON.stringify(subscription),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function postPushUnsubscribe(
  subscription: PushSubscriptionJSON | { endpoint: string },
): Promise<boolean> {
  try {
    const res = await fetch('/api/push-unsubscribe', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...passHeaders(),
      },
      body: JSON.stringify(subscription),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return (await reg.pushManager.getSubscription()) ?? null
  } catch {
    return null
  }
}

export async function resolvePushUiState(): Promise<PushUiState> {
  if (!isPushSupported()) {
    if (isIosDevice() && !isStandaloneDisplay()) return 'needs-install'
    return 'unsupported'
  }
  if (isIosDevice() && !isStandaloneDisplay()) return 'needs-install'

  if (Notification.permission === 'denied') return 'denied'

  const existing = await getExistingPushSubscription()
  if (existing && Notification.permission === 'granted') return 'enabled'

  return 'default'
}

/**
 * Request permission (must run from a user gesture on iOS), subscribe, and
 * POST the subscription to the server.
 */
export async function enablePushNotifications(): Promise<PushUiState> {
  if (!isPushSupported()) {
    return isIosDevice() && !isStandaloneDisplay() ? 'needs-install' : 'unsupported'
  }
  if (isIosDevice() && !isStandaloneDisplay()) return 'needs-install'

  const permission = await Notification.requestPermission()
  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'default'

  const publicKey = await fetchVapidPublicKey()
  if (!publicKey) return 'unsupported'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        publicKey,
      ) as BufferSource,
    })
  }

  const ok = await postPushSubscribe(sub.toJSON())
  return ok ? 'enabled' : 'default'
}
