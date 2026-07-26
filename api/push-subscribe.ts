import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertPasscode } from '../server/passcode.js'
import {
  addPushSubscription,
  parsePushSubscription,
} from '../server/pushStore.js'

/**
 * POST /api/push-subscribe — store a browser PushSubscription in Vercel KV.
 * Guarded by x-app-pass when APP_PASSCODE is set.
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

  const sub = parsePushSubscription(req.body)
  if (!sub) {
    return res.status(400).json({ error: 'Expected PushSubscription JSON' })
  }

  try {
    const saved = await addPushSubscription(sub)
    return res.status(200).json({ ok: true, saved })
  } catch {
    return res.status(500).json({ error: 'Failed to save subscription' })
  }
}
