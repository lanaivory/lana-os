import type { AppState } from '../src/lib/types.js'

export const STATE_KV_KEY = 'lana-os-state'

/** True when standard Vercel KV REST env vars are present. */
export function isKvConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.KV_REST_API_URL?.trim() && env.KV_REST_API_TOKEN?.trim(),
  )
}

/**
 * Read board state from Vercel KV. Returns null when KV is unset or empty.
 */
export async function readCloudState(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AppState | null> {
  if (!isKvConfigured(env)) return null
  const { createClient } = await import('@vercel/kv')
  const kv = createClient({
    url: env.KV_REST_API_URL!,
    token: env.KV_REST_API_TOKEN!,
  })
  const value = await kv.get<AppState>(STATE_KV_KEY)
  if (!value || typeof value !== 'object') return null
  return value
}

/**
 * Persist board state to Vercel KV. No-op (returns false) when KV is unset.
 */
export async function writeCloudState(
  state: AppState,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!isKvConfigured(env)) return false
  const { createClient } = await import('@vercel/kv')
  const kv = createClient({
    url: env.KV_REST_API_URL!,
    token: env.KV_REST_API_TOKEN!,
  })
  await kv.set(STATE_KV_KEY, state)
  return true
}
