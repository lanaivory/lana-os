import type { AppState } from './types'
import { loadPasscode } from './passcode'
import { migrateState } from './storage'

const STATE_URL = '/api/state'

function passHeaders(): HeadersInit {
  const pass = loadPasscode()
  return pass ? { 'x-app-pass': pass } : {}
}

/**
 * Fetch cloud board. Returns null when empty, unauthorized, or KV unset.
 */
export async function fetchCloudState(): Promise<AppState | null> {
  try {
    const res = await fetch(STATE_URL, {
      headers: { Accept: 'application/json', ...passHeaders() },
    })
    if (!res.ok) return null
    const data = (await res.json()) as unknown
    if (!data || typeof data !== 'object') return null
    return migrateState(data as Partial<AppState>)
  } catch {
    return null
  }
}

/** Push full board to cloud. Returns false on failure / local-only mode. */
export async function pushCloudState(state: AppState): Promise<boolean> {
  try {
    const res = await fetch(STATE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...passHeaders(),
      },
      body: JSON.stringify(state),
    })
    if (!res.ok) return false
    const data = (await res.json()) as { saved?: boolean }
    return Boolean(data?.saved)
  } catch {
    return false
  }
}

export function statesEqual(a: AppState, b: AppState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
