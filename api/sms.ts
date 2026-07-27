import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ingestSmsIntoCloudState } from '../server/smsBoard.js'
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
 * Classifies Body with the shared splitter/classifier, writes to-dos into the
 * shared KV board state (same pipeline as the client), marks the MessageSid
 * ingested so /api/inbox will not re-add, replies with TwiML, then fans out
 * a web push deep-linked to the first task.
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

    // Persist to shared board before push so notification tap finds the task.
    if (todos.length > 0 && messageSid) {
      try {
        await ingestSmsIntoCloudState(raw, messageSid)
      } catch {
        // soft-fail — inbox poll remains a fallback
      }
    }

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
