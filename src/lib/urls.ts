const URL_RE = /https?:\/\/[^\s)]+/i

export function extractUrl(text: string): string | null {
  const match = text.match(URL_RE)
  return match ? match[0] : null
}

/** Title shown in the row when a URL is represented by the link icon. */
export function displayTextWithoutUrl(text: string): string {
  const url = extractUrl(text)
  if (!url) return text
  const cleaned = text
    .replace(url, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
}
