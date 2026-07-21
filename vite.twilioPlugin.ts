import type { Plugin } from 'vite'
import { assertPasscode } from './server/passcode.ts'
import {
  buildSmsConfirmation,
  buildTwimlMessage,
  extractTwilioBody,
} from './server/smsConfirm.ts'
import { readCloudState, writeCloudState } from './server/stateStore.ts'
import { fetchTwilioInbox } from './server/twilioInbox.ts'
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

/** Dev-only middleware mirroring Vercel /api/inbox, /api/sms, /api/state. */
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
          const confirmation = buildSmsConfirmation(body)
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
    },
  }
}
