import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertPasscode } from '../server/passcode.js'
import {
  parsePushSubscription,
  removePushSubscription,
} from '../server/pushStore.js'

/**
 * POST /api/push-unsubscribe — remove one PushSubscription from Vercel KV.
 * Guarded by x-app-pass when APP_PASSCODE is set.
 * Body: full PushSubscription JSON, or `{ endpoint: string }`.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method && req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const auth = assertPasscode(req.headers['x-app-pass'])
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.message })
  }

  const body = req.body
  const sub = parsePushSubscription(body)
  const endpoint =
    sub?.endpoint ??
    (body &&
    typeof body === 'object' &&
    typeof (body as { endpoint?: unknown }).endpoint === 'string'
      ? (body as { endpoint: string }).endpoint.trim()
      : '')

  if (!endpoint) {
    return res.status(400).json({ error: 'Expected PushSubscription or endpoint' })
  }

  try {
    const removed = await removePushSubscription(sub ?? endpoint)
    return res.status(200).json({ ok: true, removed })
  } catch {
    return res.status(500).json({ error: 'Failed to remove subscription' })
  }
}
