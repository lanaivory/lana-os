import { describe, expect, it } from 'vitest'
import {
  parsePushSubscription,
  PUSH_SUBS_KV_KEY,
} from './pushStore.js'

describe('pushStore', () => {
  it('uses a stable KV set key', () => {
    expect(PUSH_SUBS_KV_KEY).toBe('lana-os-push-subs')
  })

  it('accepts a valid PushSubscription JSON body', () => {
    const sub = parsePushSubscription({
      endpoint: 'https://push.example/abc',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
    })
    expect(sub).toEqual({
      endpoint: 'https://push.example/abc',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
    })
  })

  it('rejects incomplete subscription bodies', () => {
    expect(parsePushSubscription(null)).toBeNull()
    expect(parsePushSubscription({})).toBeNull()
    expect(
      parsePushSubscription({
        endpoint: 'https://x',
        keys: { p256dh: 'p' },
      }),
    ).toBeNull()
    expect(
      parsePushSubscription({
        endpoint: '   ',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    ).toBeNull()
  })
})
