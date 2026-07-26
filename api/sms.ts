import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  buildSmsConfirmation,
  buildTwimlMessage,
  classifyInboundTodos,
  extractTwilioBody,
  extractTwilioMessageSid,
} from '../server/smsConfirm.js'
import { sendPushToAll } from '../server/webPush.js'

/**
 * POST /api/sms — Twilio inbound webhook.
 * Classifies Body with the shared splitter/classifier and replies with TwiML.
 * After capture confirmation, fans out a web push to stored subscriptions.
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
    const todos = classifyInboundTodos(raw, messageSid)

    // Notify installed PWAs; never let push failures break Twilio TwiML.
    if (todos.length > 0) {
      try {
        const first = todos[0]
        await sendPushToAll(confirmation, process.env, {}, {
          taskId: first.taskId,
          listId: first.listId,
          url: first.taskId
            ? `/?focus=${encodeURIComponent(first.taskId)}`
            : '/',
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
