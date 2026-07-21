import { describe, expect, it } from 'vitest'
import { isKvConfigured, STATE_KV_KEY } from './stateStore.js'

describe('stateStore', () => {
  it('detects missing KV configuration', () => {
    expect(isKvConfigured({})).toBe(false)
    expect(isKvConfigured({ KV_REST_API_URL: 'https://x' })).toBe(false)
    expect(
      isKvConfigured({
        KV_REST_API_URL: 'https://x',
        KV_REST_API_TOKEN: 'tok',
      }),
    ).toBe(true)
  })

  it('uses a stable KV key', () => {
    expect(STATE_KV_KEY).toBe('lana-os-state')
  })
})
