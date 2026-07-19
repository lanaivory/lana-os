import type { Plugin } from 'vite'
import {
  buildSmsConfirmation,
  buildTwimlMessage,
  extractTwilioBody,
} from './server/smsConfirm.ts'
import { fetchTwilioInbox } from './server/twilioInbox.ts'

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

/** Dev-only middleware mirroring Vercel /api/inbox and /api/sms. */
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
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(messages))
        } catch {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end('[]')
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
    },
  }
}
