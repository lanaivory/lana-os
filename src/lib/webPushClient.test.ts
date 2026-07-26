import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from './webPushClient'

describe('webPushClient', () => {
  it('decodes URL-safe base64 VAPID keys', () => {
    // "hello" in standard base64 is aGVsbG8= → URL-safe aGVsbG8
    const bytes = urlBase64ToUint8Array('aGVsbG8')
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
  })
})
