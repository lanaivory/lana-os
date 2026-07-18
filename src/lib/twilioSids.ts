const SIDS_KEY = 'lana-os:twilio-consumed-sids'

export function loadConsumedSids(): Set<string> {
  try {
    const raw = localStorage.getItem(SIDS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((s): s is string => typeof s === 'string'))
  } catch {
    return new Set()
  }
}

export function saveConsumedSids(sids: Set<string>): void {
  // Cap growth — keep the most recent ~500 ids.
  const list = [...sids]
  const trimmed = list.length > 500 ? list.slice(-500) : list
  localStorage.setItem(SIDS_KEY, JSON.stringify(trimmed))
}

export function markConsumed(sids: Set<string>, sid: string): Set<string> {
  const next = new Set(sids)
  next.add(sid)
  saveConsumedSids(next)
  return next
}
