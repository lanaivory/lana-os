import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertPasscode } from '../server/passcode.js'
import { readCloudState, writeCloudState } from '../server/stateStore.js'
import { migrateState } from '../src/lib/storage.js'

/**
 * GET /api/state — load board JSON from Vercel KV (null when empty / unset).
 * POST /api/state — save board JSON. Requires x-app-pass when APP_PASSCODE is set.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const auth = assertPasscode(req.headers['x-app-pass'])
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.message })
  }

  const method = req.method ?? 'GET'

  if (method === 'GET') {
    try {
      const state = await readCloudState()
      return res.status(200).json(state)
    } catch {
      return res.status(200).json(null)
    }
  }

  if (method === 'POST') {
    try {
      const body = req.body
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Expected JSON body' })
      }
      const state = migrateState(body)
      const saved = await writeCloudState(state)
      // When KV is not configured, acknowledge so the client keeps localStorage.
      return res.status(200).json({ ok: true, saved })
    } catch {
      return res.status(500).json({ error: 'Failed to save' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}
