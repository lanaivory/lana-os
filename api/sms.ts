import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  buildSmsConfirmation,
  buildTwimlMessage,
  extractTwilioBody,
} from '../server/smsConfirm.js'

/**
 * POST /api/sms — Twilio inbound webhook.
 * Classifies Body with the shared splitter/classifier and replies with TwiML.
 * Does not store anything; board population stays on GET /api/inbox polling.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method && req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).send('Method Not Allowed')
  }

  try {
    const raw = extractTwilioBody(req.body)
    const confirmation = buildSmsConfirmation(raw)
    const twiml = buildTwimlMessage(confirmation)
    res.setHeader('Content-Type', 'text/xml; charset=utf-8')
    return res.status(200).send(twiml)
  } catch {
    // Soft-fail so Twilio does not retry forever; still valid TwiML.
    const twiml = buildTwimlMessage('Got it ✅')
    res.setHeader('Content-Type', 'text/xml; charset=utf-8')
    return res.status(200).send(twiml)
  }
}
