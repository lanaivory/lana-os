import { describe, expect, it } from 'vitest'
import { fetchTwilioInbox } from './twilioInbox.ts'

describe('fetchTwilioInbox', () => {
  it('returns an empty list when env vars are missing', async () => {
    await expect(fetchTwilioInbox({})).resolves.toEqual([])
    await expect(
      fetchTwilioInbox({
        TWILIO_ACCOUNT_SID: 'ACxxx',
        TWILIO_AUTH_TOKEN: '',
        TWILIO_NUMBER: '+15551234567',
      }),
    ).resolves.toEqual([])
  })
})
