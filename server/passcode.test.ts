import { describe, expect, it } from 'vitest'
import { assertPasscode } from './passcode.js'

describe('assertPasscode', () => {
  it('allows any request when APP_PASSCODE is unset', () => {
    expect(assertPasscode(undefined, {})).toEqual({ ok: true })
    expect(assertPasscode('anything', {})).toEqual({ ok: true })
  })

  it('rejects missing or wrong pass when APP_PASSCODE is set', () => {
    const env = { APP_PASSCODE: 'secret' }
    expect(assertPasscode(undefined, env)).toMatchObject({
      ok: false,
      status: 401,
    })
    expect(assertPasscode('nope', env)).toMatchObject({ ok: false, status: 401 })
    expect(assertPasscode('secret', env)).toEqual({ ok: true })
  })
})
