import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchTwilioInbox } from '../server/twilioInbox.js'

/**
 * GET /api/inbox — recent inbound SMS for the configured Twilio number.
 * Missing env vars → empty list (200). Never exposes secrets.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json([])
  }

  try {
    const messages = await fetchTwilioInbox({
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_NUMBER: process.env.TWILIO_NUMBER,
    })
    return res.status(200).json(messages)
  } catch {
    // Soft-fail for the client poller: empty list, still OK for "connected"
    // only when the function itself ran. Surface as 200 empty on config-less
    // already handled above; Twilio errors return empty rather than break the board.
    return res.status(200).json([])
  }
}
