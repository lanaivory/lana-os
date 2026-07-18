export type InboxMessage = {
  sid: string
  body: string
  dateSent: string
}

type TwilioEnv = {
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_NUMBER?: string
}

type TwilioMessage = {
  sid?: string
  body?: string
  date_sent?: string
  direction?: string
  to?: string
}

/**
 * List recent inbound SMS to TWILIO_NUMBER via the Twilio REST API.
 * Returns [] when credentials are missing — never throws for that case.
 */
export async function fetchTwilioInbox(
  env: TwilioEnv,
): Promise<InboxMessage[]> {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = env.TWILIO_AUTH_TOKEN?.trim()
  const number = env.TWILIO_NUMBER?.trim()

  if (!accountSid || !authToken || !number) {
    return []
  }

  const params = new URLSearchParams({
    To: number,
    PageSize: '50',
  })
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json?${params}`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Twilio Messages API ${res.status}`)
  }

  const data = (await res.json()) as { messages?: TwilioMessage[] }
  const messages = data.messages ?? []

  return messages
    .filter((m) => (m.direction ?? '').toLowerCase() === 'inbound')
    .filter((m) => Boolean(m.sid && m.body != null))
    .map((m) => ({
      sid: String(m.sid),
      body: String(m.body ?? ''),
      dateSent: String(m.date_sent ?? ''),
    }))
}
