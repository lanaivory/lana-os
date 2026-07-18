/**
 * Split a quick-capture blob into individual task strings.
 * Handles newlines, bullets, numbered lists, and "and then" / semicolon chains.
 */

const BULLET = /^\s*(?:[-*•▪︎]|[\d]+[.)])\s+/
const ACTION_SPLIT = /\s*(?:;|\band then\b|\bthen\b)\s+/i

export function splitCaptureText(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET, '').trim())
    .filter(Boolean)

  const tasks: string[] = []

  for (const line of lines) {
    // Don't split URLs or short single phrases aggressively.
    if (looksLikeUrl(line) || line.length < 12) {
      tasks.push(line)
      continue
    }

    const parts = line
      .split(ACTION_SPLIT)
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length > 1 && parts.every((p) => p.split(/\s+/).length >= 2)) {
      tasks.push(...parts)
    } else {
      tasks.push(line)
    }
  }

  return dedupePreserveOrder(tasks)
}

function looksLikeUrl(text: string): boolean {
  return /https?:\/\/|www\./i.test(text)
}

function dedupePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
