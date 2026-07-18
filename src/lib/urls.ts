const URL_RE = /https?:\/\/[^\s)]+/i

export function extractUrl(text: string): string | null {
  const match = text.match(URL_RE)
  return match ? match[0] : null
}
