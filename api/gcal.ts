import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchCalendarFeed } from '../server/calendarFeed.js'

/**
 * GET /api/gcal?url=… — read an external calendar feed on the client's behalf.
 * Read-only: nothing is ever written back to the calendar.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const raw = req.query.url
  const url = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
  if (!url) return res.status(400).json({ error: 'Expected a url parameter' })

  const result = await fetchCalendarFeed(url)
  if (!result.ok) return res.status(result.status).json({ error: result.error })

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Cache-Control', 'private, max-age=300')
  return res.status(200).send(result.text)
}
