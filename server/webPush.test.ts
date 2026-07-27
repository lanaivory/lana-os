import { describe, expect, it, vi } from 'vitest'
import {
  isVapidConfigured,
  sendPushToAll,
  shouldPrunePushStatus,
} from './webPush.js'
import type { StoredPushSubscription } from './pushStore.js'

describe('webPush', () => {
  it('requires all three VAPID env vars', () => {
    expect(isVapidConfigured({})).toBe(false)
    expect(
      isVapidConfigured({
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
      }),
    ).toBe(false)
    expect(
      isVapidConfigured({
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
        VAPID_SUBJECT: 'mailto:a@b.c',
      }),
    ).toBe(true)
  })

  it('prunes only 404 and 410', () => {
    expect(shouldPrunePushStatus(404)).toBe(true)
    expect(shouldPrunePushStatus(410)).toBe(true)
    expect(shouldPrunePushStatus(500)).toBe(false)
    expect(shouldPrunePushStatus(undefined)).toBe(false)
  })

  it('no-ops when VAPID is unset', async () => {
    const result = await sendPushToAll('Got it ✅', {})
    expect(result).toEqual({ sent: 0, failed: 0, pruned: 0 })
  })

  it('sends to every subscription and prunes dead ones', async () => {
    const alive: StoredPushSubscription = {
      endpoint: 'https://push.example/alive',
      keys: { p256dh: 'p1', auth: 'a1' },
    }
    const dead: StoredPushSubscription = {
      endpoint: 'https://push.example/dead',
      keys: { p256dh: 'p2', auth: 'a2' },
    }

    const remove = vi.fn(async () => true)
    const send = vi.fn(async (sub: StoredPushSubscription) => {
      if (sub.endpoint.includes('dead')) {
        const err = new Error('Gone') as Error & { statusCode: number }
        err.statusCode = 410
        throw err
      }
    })
    const setVapid = vi.fn()

    const result = await sendPushToAll(
      'Got it ✅ dentist → Appointments',
      {
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
        VAPID_SUBJECT: 'mailto:a@b.c',
      },
      {
        list: async () => [alive, dead],
        remove,
        send: send as never,
        setVapid: setVapid as never,
      },
    )

    expect(setVapid).toHaveBeenCalledWith('mailto:a@b.c', 'pub', 'priv')
    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith(
      alive,
      JSON.stringify({
        title: 'Lana OS',
        body: 'Got it ✅ dentist → Appointments',
        url: '/',
      }),
    )
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith(dead, expect.anything())
    expect(result).toEqual({ sent: 1, failed: 1, pruned: 1 })
  })

  it('includes task/list deep-link fields in the payload', async () => {
    const alive: StoredPushSubscription = {
      endpoint: 'https://push.example/alive',
      keys: { p256dh: 'p1', auth: 'a1' },
    }
    const send = vi.fn(async () => undefined)
    const setVapid = vi.fn()

    await sendPushToAll(
      'dentist',
      {
        VAPID_PUBLIC_KEY: 'pub',
        VAPID_PRIVATE_KEY: 'priv',
        VAPID_SUBJECT: 'mailto:a@b.c',
      },
      {
        list: async () => [alive],
        send: send as never,
        setVapid: setVapid as never,
      },
      {
        title: 'Added to Appointments',
        taskId: 'sms_SM123_0',
        listId: 'appointments',
      },
    )

    expect(send).toHaveBeenCalledWith(
      alive,
      JSON.stringify({
        title: 'Added to Appointments',
        body: 'dentist',
        taskId: 'sms_SM123_0',
        listId: 'appointments',
        url: '/?focus=sms_SM123_0',
      }),
    )
  })
})
