import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readVapidConfig } from '../server/webPush.js'

/**
 * GET /api/push-public-key — expose VAPID public key for PushManager.subscribe.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const vapid = readVapidConfig()
  if (!vapid) {
    return res.status(503).json({ error: 'Push not configured' })
  }

  return res.status(200).json({ publicKey: vapid.publicKey })
}
