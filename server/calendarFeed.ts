/**
 * Read-only pass-through for an external calendar feed. Browsers cannot fetch
 * a cross-origin `.ics` directly, so the server does it — and only ever reads.
 */

const MAX_BYTES = 2_000_000

export type FeedFetchResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string }

/** Only https calendar feeds, and never an internal address. */
export function isAllowedFeedUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (host === '[::1]' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
  return true
}

export async function fetchCalendarFeed(
  raw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FeedFetchResult> {
  if (!isAllowedFeedUrl(raw)) {
    return { ok: false, status: 400, error: 'Expected an https calendar URL' }
  }

  try {
    const res = await fetchImpl(raw, {
      headers: { Accept: 'text/calendar, text/plain' },
      redirect: 'follow',
    })
    if (!res.ok) {
      return { ok: false, status: 502, error: `Feed responded ${res.status}` }
    }
    const text = await res.text()
    if (text.length > MAX_BYTES) {
      return { ok: false, status: 502, error: 'Feed is too large' }
    }
    return { ok: true, text }
  } catch {
    return { ok: false, status: 502, error: 'Could not reach the feed' }
  }
}
