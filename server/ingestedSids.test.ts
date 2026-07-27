import { describe, expect, it } from 'vitest'
import { INGESTED_SIDS_KV_KEY } from './ingestedSids.js'
import { isKvConfigured } from './stateStore.js'

describe('ingestedSids', () => {
  it('uses a stable KV key', () => {
    expect(INGESTED_SIDS_KV_KEY).toBe('lana-os-ingested-sids')
  })

  it('relies on the same KV env gate as board state', () => {
    expect(isKvConfigured({})).toBe(false)
    expect(
      isKvConfigured({
        KV_REST_API_URL: 'https://x',
        KV_REST_API_TOKEN: 'tok',
      }),
    ).toBe(true)
  })
})
