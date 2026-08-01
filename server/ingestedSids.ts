import { isKvConfigured } from './stateStore.js'

export const INGESTED_SIDS_KV_KEY = 'lana-os-ingested-sids'

/** Cap growth of the ingested SID set (Redis set members). */
const MAX_INGESTED_SIDS = 500

async function kvClient(env: NodeJS.ProcessEnv) {
  const { createClient } = await import('@vercel/kv')
  return createClient({
    url: env.KV_REST_API_URL!,
    token: env.KV_REST_API_TOKEN!,
  })
}

/** True when this Twilio MessageSid was already written to the board via /api/sms. */
export async function isSidIngested(
  sid: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const trimmed = sid.trim()
  if (!trimmed || !isKvConfigured(env)) return false
  const kv = await kvClient(env)
  const hit = await kv.sismember(INGESTED_SIDS_KV_KEY, trimmed)
  return Boolean(hit)
}

/** Mark MessageSids as ingested so /api/inbox polling will not re-add them. */
export async function markSidsIngested(
  sids: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const cleaned = [
    ...new Set(sids.map((s) => s.trim()).filter(Boolean)),
  ]
  if (cleaned.length === 0 || !isKvConfigured(env)) return false

  const kv = await kvClient(env)
  if (cleaned.length === 1) {
    await kv.sadd(INGESTED_SIDS_KV_KEY, cleaned[0])
  } else {
    await kv.sadd(INGESTED_SIDS_KV_KEY, cleaned[0], ...cleaned.slice(1))
  }

  // Soft trim: if the set grew too large, drop an arbitrary older slice.
  try {
    const size = await kv.scard(INGESTED_SIDS_KV_KEY)
    if (typeof size === 'number' && size > MAX_INGESTED_SIDS) {
      const overflow = size - MAX_INGESTED_SIDS
      const members = await kv.smembers<string[]>(INGESTED_SIDS_KV_KEY)
      if (Array.isArray(members) && members.length > 0) {
        const drop = members.slice(0, Math.min(overflow, members.length))
        if (drop.length === 1) {
          await kv.srem(INGESTED_SIDS_KV_KEY, drop[0])
        } else if (drop.length > 1) {
          await kv.srem(INGESTED_SIDS_KV_KEY, drop[0], ...drop.slice(1))
        }
      }
    }
  } catch {
    // trim is best-effort
  }

  return true
}

/** Filter inbox messages whose SIDs were already ingested by the webhook. */
export async function filterOutIngestedSids<T extends { sid: string }>(
  messages: T[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<T[]> {
  if (messages.length === 0 || !isKvConfigured(env)) return messages

  const kv = await kvClient(env)
  const kept: T[] = []
  for (const msg of messages) {
    const sid = msg.sid?.trim()
    if (!sid) continue
    const hit = await kv.sismember(INGESTED_SIDS_KV_KEY, sid)
    if (!hit) kept.push(msg)
  }
  return kept
}
