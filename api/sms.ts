import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  buildPushConfirmation,
  buildSmsConfirmation,
  buildTwimlMessage,
  extractTwilioBody,
  extractTwilioMessageSid,
} from '../server/smsConfirm.js'
import { sendPushToAll } from '../server/webPush.js'

/**
 * POST /api/sms — Twilio inbound webhook.
 * Classifies Body with the shared splitter/classifier and replies with TwiML.
 * After capture confirmation, fans out a web push naming the destination list.
 * Board population stays on GET /api/inbox polling.
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
    const messageSid = extractTwilioMessageSid(req.body)
    const confirmation = buildSmsConfirmation(raw)
    const push = buildPushConfirmation(raw, messageSid)

    // Notify installed PWAs; never let push failures break Twilio TwiML.
    if (push) {
      try {
        await sendPushToAll(push.body, process.env, {}, {
          title: push.title,
          taskId: push.taskId,
          listId: push.listId,
          url: push.url,
        })
      } catch {
        // soft-fail
      }
    }

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
