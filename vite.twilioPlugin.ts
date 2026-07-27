import type { Plugin } from 'vite'
import { assertPasscode } from './server/passcode.ts'
import {
  addPushSubscription,
  parsePushSubscription,
  removePushSubscription,
} from './server/pushStore.ts'
import {
  buildPushConfirmation,
  buildSmsConfirmation,
  buildTwimlMessage,
  extractTwilioBody,
  extractTwilioMessageSid,
} from './server/smsConfirm.ts'
import { readCloudState, writeCloudState } from './server/stateStore.ts'
import { fetchTwilioInbox } from './server/twilioInbox.ts'
import { readVapidConfig, sendPushToAll } from './server/webPush.ts'
import type { AppState } from './src/lib/types.ts'

async function readRequestBody(req: {
  on: (event: string, cb: (...args: unknown[]) => void) => void
}): Promise<string> {
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
    })
    req.on('end', () => resolve())
    req.on('error', (err) => reject(err))
  })
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(
  res: {
    statusCode: number
    setHeader: (k: string, v: string) => void
    end: (b: string) => void
  },
  status: number,
  body: unknown,
) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Dev-only middleware mirroring Vercel /api/* routes. */
export function twilioInboxPlugin(): Plugin {
  return {
    name: 'lana-twilio-inbox',
    configureServer(server) {
      server.middlewares.use('/api/inbox', async (req, res) => {
        if (req.method && req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET')
          res.setHeader('Content-Type', 'application/json')
          res.end('[]')
          return
        }

        try {
          const messages = await fetchTwilioInbox({
            TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
            TWILIO_NUMBER: process.env.TWILIO_NUMBER,
          })
          sendJson(res, 200, messages)
        } catch {
          sendJson(res, 200, [])
        }
      })

      server.middlewares.use('/api/sms', async (req, res) => {
        if (req.method && req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          res.setHeader('Content-Type', 'text/plain')
          res.end('Method Not Allowed')
          return
        }

        try {
          const rawBody = await readRequestBody(req)
          const body = extractTwilioBody(rawBody)
          const messageSid = extractTwilioMessageSid(rawBody)
          const confirmation = buildSmsConfirmation(body)
          const push = buildPushConfirmation(body, messageSid)
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
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/xml; charset=utf-8')
          res.end(twiml)
        } catch {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/xml; charset=utf-8')
          res.end(buildTwimlMessage('Got it ✅'))
        }
      })

      server.middlewares.use('/api/state', async (req, res) => {
        const auth = assertPasscode(req.headers['x-app-pass'])
        if (!auth.ok) {
          sendJson(res, auth.status, { error: auth.message })
          return
        }

        const method = req.method ?? 'GET'

        if (method === 'GET') {
          try {
            const state = await readCloudState()
            sendJson(res, 200, state)
          } catch {
            sendJson(res, 200, null)
          }
          return
        }

        if (method === 'POST') {
          try {
            const raw = await readRequestBody(req)
            const parsed = raw ? (JSON.parse(raw) as unknown) : null
            if (!parsed || typeof parsed !== 'object') {
              sendJson(res, 400, { error: 'Expected JSON body' })
              return
            }
            const saved = await writeCloudState(parsed as AppState)
            sendJson(res, 200, { ok: true, saved })
          } catch {
            sendJson(res, 500, { error: 'Failed to save' })
          }
          return
        }

        res.statusCode = 405
        res.setHeader('Allow', 'GET, POST')
        sendJson(res, 405, { error: 'Method Not Allowed' })
      })

      server.middlewares.use('/api/push-public-key', async (req, res) => {
        if (req.method && req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Allow', 'GET')
          sendJson(res, 405, { error: 'Method Not Allowed' })
          return
        }
        const vapid = readVapidConfig()
        if (!vapid) {
          sendJson(res, 503, { error: 'Push not configured' })
          return
        }
        sendJson(res, 200, { publicKey: vapid.publicKey })
      })

      server.middlewares.use('/api/push-subscribe', async (req, res) => {
        if (req.method && req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          sendJson(res, 405, { error: 'Method Not Allowed' })
          return
        }

        const auth = assertPasscode(req.headers['x-app-pass'])
        if (!auth.ok) {
          sendJson(res, auth.status, { error: auth.message })
          return
        }

        try {
          const raw = await readRequestBody(req)
          const parsed = raw ? (JSON.parse(raw) as unknown) : null
          const sub = parsePushSubscription(parsed)
          if (!sub) {
            sendJson(res, 400, { error: 'Expected PushSubscription JSON' })
            return
          }
          const saved = await addPushSubscription(sub)
          if (!saved) {
            sendJson(res, 503, { error: 'Push storage not configured', saved: false })
            return
          }
          sendJson(res, 200, { ok: true, saved: true })
        } catch {
          sendJson(res, 500, { error: 'Failed to save subscription' })
        }
      })

      server.middlewares.use('/api/push-unsubscribe', async (req, res) => {
        if (req.method && req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          sendJson(res, 405, { error: 'Method Not Allowed' })
          return
        }

        const auth = assertPasscode(req.headers['x-app-pass'])
        if (!auth.ok) {
          sendJson(res, auth.status, { error: auth.message })
          return
        }

        try {
          const raw = await readRequestBody(req)
          const parsed = raw ? (JSON.parse(raw) as unknown) : null
          const sub = parsePushSubscription(parsed)
          const endpoint =
            sub?.endpoint ??
            (parsed &&
            typeof parsed === 'object' &&
            typeof (parsed as { endpoint?: unknown }).endpoint === 'string'
              ? (parsed as { endpoint: string }).endpoint.trim()
              : '')
          if (!endpoint) {
            sendJson(res, 400, {
              error: 'Expected PushSubscription or endpoint',
            })
            return
          }
          const removed = await removePushSubscription(sub ?? endpoint)
          sendJson(res, 200, { ok: true, removed })
        } catch {
          sendJson(res, 500, { error: 'Failed to remove subscription' })
        }
      })
    },
  }
}
