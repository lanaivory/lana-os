import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runDueReminders } from '../server/reminders.js'

/**
 * GET|POST /api/reminders — send commitment reminders that have come due.
 *
 * Idempotent: each reminder is marked sent as it goes out, so the scheduled
 * job and the app can both call this without anyone hearing it twice.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const result = await runDueReminders()
    return res.status(200).json(result)
  } catch {
    // Never let a sweep failure become a retry storm.
    return res.status(200).json({ sent: 0, due: 0, saved: false })
  }
}
