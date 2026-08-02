/**
 * The app's inbound number — the one you text your to-dos to. It is served by
 * the API (from the Twilio config) so a phone never has to be told twice, with
 * a manual override in Settings for deployments that keep it elsewhere.
 */

/** `+15551234567` → `+1 (555) 123-4567`; anything else is returned as given. */
export function formatCaptureNumber(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (!trimmed.startsWith('+') && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return trimmed
}

/** A one-contact vCard, so "save the number" is a single tap. */
export function contactCardHref(number: string, name = 'Lana OS'): string {
  const card = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `TEL;TYPE=CELL:${number.trim()}`,
    'NOTE:Text your to-dos here.',
    'END:VCARD',
    '',
  ].join('\n')
  return `data:text/vcard;charset=utf-8,${encodeURIComponent(card)}`
}

export async function fetchCaptureNumber(): Promise<string> {
  try {
    const res = await fetch('/api/capture-number', {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { number?: unknown }
    return typeof data.number === 'string' ? data.number.trim() : ''
  } catch {
    return ''
  }
}
