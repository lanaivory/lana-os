import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * GET /api/capture-number — the inbound number to text to-dos to.
 * Public by design: it is the number printed on the app, not a secret.
 * Returns an empty string when Twilio is not configured.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  return res.status(200).json({ number: process.env.TWILIO_NUMBER?.trim() ?? '' })
}
