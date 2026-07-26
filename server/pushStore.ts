import { isKvConfigured } from './stateStore.js'

export const PUSH_SUBS_KV_KEY = 'lana-os-push-subs'

/** Shape stored in KV (JSON string members of a Redis set). */
export type StoredPushSubscription = {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export function isPushSubscription(value: unknown): value is StoredPushSubscription {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (typeof v.endpoint !== 'string' || !v.endpoint.trim()) return false
  const keys = v.keys
  if (!keys || typeof keys !== 'object') return false
  const k = keys as Record<string, unknown>
  return typeof k.p256dh === 'string' && typeof k.auth === 'string'
}

/** Normalize request body into a storable subscription, or null if invalid. */
export function parsePushSubscription(body: unknown): StoredPushSubscription | null {
  if (!isPushSubscription(body)) return null
  return {
    endpoint: body.endpoint.trim(),
    expirationTime: body.expirationTime ?? null,
    keys: {
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  }
}

function serialize(sub: StoredPushSubscription): string {
  return JSON.stringify({
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: sub.keys,
  })
}

async function kvClient(env: NodeJS.ProcessEnv) {
  const { createClient } = await import('@vercel/kv')
  return createClient({
    url: env.KV_REST_API_URL!,
    token: env.KV_REST_API_TOKEN!,
  })
}

/** Add a browser PushSubscription to the KV set. No-op when KV unset. */
export async function addPushSubscription(
  sub: StoredPushSubscription,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!isKvConfigured(env)) return false
  const kv = await kvClient(env)
  // Drop any prior member with the same endpoint (keys may rotate).
  const existing = await listPushSubscriptions(env)
  for (const prev of existing) {
    if (prev.endpoint === sub.endpoint) {
      await kv.srem(PUSH_SUBS_KV_KEY, serialize(prev))
    }
  }
  await kv.sadd(PUSH_SUBS_KV_KEY, serialize(sub))
  return true
}

/** Remove one subscription (by full object or endpoint). No-op when KV unset. */
export async function removePushSubscription(
  subOrEndpoint: StoredPushSubscription | string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!isKvConfigured(env)) return false
  const kv = await kvClient(env)
  const endpoint =
    typeof subOrEndpoint === 'string' ? subOrEndpoint : subOrEndpoint.endpoint

  if (typeof subOrEndpoint !== 'string') {
    await kv.srem(PUSH_SUBS_KV_KEY, serialize(subOrEndpoint))
  }

  // Also remove any stored member that matches by endpoint.
  const existing = await listPushSubscriptions(env)
  for (const prev of existing) {
    if (prev.endpoint === endpoint) {
      await kv.srem(PUSH_SUBS_KV_KEY, serialize(prev))
    }
  }
  return true
}

/** List all stored subscriptions. Empty when KV unset. */
export async function listPushSubscriptions(
  env: NodeJS.ProcessEnv = process.env,
): Promise<StoredPushSubscription[]> {
  if (!isKvConfigured(env)) return []
  const kv = await kvClient(env)
  const members = await kv.smembers<string[]>(PUSH_SUBS_KV_KEY)
  if (!Array.isArray(members)) return []

  const out: StoredPushSubscription[] = []
  for (const member of members) {
    try {
      const parsed =
        typeof member === 'string' ? (JSON.parse(member) as unknown) : member
      const sub = parsePushSubscription(parsed)
      if (sub) out.push(sub)
    } catch {
      // skip corrupt members
    }
  }
  return out
}
