import webpush from 'web-push'
import {
  listPushSubscriptions,
  removePushSubscription,
  type StoredPushSubscription,
} from './pushStore.js'

export type VapidConfig = {
  publicKey: string
  privateKey: string
  subject: string
}

/** True when VAPID public/private/subject env vars are all set. */
export function isVapidConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    env.VAPID_PUBLIC_KEY?.trim() &&
      env.VAPID_PRIVATE_KEY?.trim() &&
      env.VAPID_SUBJECT?.trim(),
  )
}

export function readVapidConfig(
  env: NodeJS.ProcessEnv = process.env,
): VapidConfig | null {
  if (!isVapidConfigured(env)) return null
  return {
    publicKey: env.VAPID_PUBLIC_KEY!.trim(),
    privateKey: env.VAPID_PRIVATE_KEY!.trim(),
    subject: env.VAPID_SUBJECT!.trim(),
  }
}

/** Dead endpoint status codes that should be pruned from KV. */
export function shouldPrunePushStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410
}

function statusFromError(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const statusCode = (err as { statusCode?: unknown }).statusCode
  return typeof statusCode === 'number' ? statusCode : undefined
}

export type PushSendResult = {
  sent: number
  failed: number
  pruned: number
}

/**
 * Send a web push to every stored subscription.
 * Title is always "Lana OS"; body is the SMS confirmation text.
 * Prunes 404/410 subscriptions. Soft no-op when VAPID or KV unset.
 */
export async function sendPushToAll(
  body: string,
  env: NodeJS.ProcessEnv = process.env,
  deps: {
    list?: typeof listPushSubscriptions
    remove?: typeof removePushSubscription
    send?: typeof webpush.sendNotification
    setVapid?: typeof webpush.setVapidDetails
  } = {},
): Promise<PushSendResult> {
  const vapid = readVapidConfig(env)
  if (!vapid) return { sent: 0, failed: 0, pruned: 0 }

  const list = deps.list ?? listPushSubscriptions
  const remove = deps.remove ?? removePushSubscription
  const send = deps.send ?? webpush.sendNotification.bind(webpush)
  const setVapid = deps.setVapid ?? webpush.setVapidDetails.bind(webpush)

  setVapid(vapid.subject, vapid.publicKey, vapid.privateKey)

  const subs = await list(env)
  if (subs.length === 0) return { sent: 0, failed: 0, pruned: 0 }

  const payload = JSON.stringify({
    title: 'Lana OS',
    body,
  })

  let sent = 0
  let failed = 0
  let pruned = 0

  await Promise.all(
    subs.map(async (sub: StoredPushSubscription) => {
      try {
        await send(sub, payload)
        sent += 1
      } catch (err) {
        failed += 1
        if (shouldPrunePushStatus(statusFromError(err))) {
          try {
            await remove(sub, env)
            pruned += 1
          } catch {
            // ignore prune errors
          }
        }
      }
    }),
  )

  return { sent, failed, pruned }
}
