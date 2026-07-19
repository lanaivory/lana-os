import type { Plugin } from 'vite'
import { fetchTwilioInbox } from './server/twilioInbox.ts'

/** Dev-only middleware mirroring Vercel GET /api/inbox. */
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
    },
  }
}
