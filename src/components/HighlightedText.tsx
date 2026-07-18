type Props = {
  text: string
  query: string
}

export function HighlightedText({ text, query }: Props) {
  const q = query.trim()
  if (!q) return <>{text}</>

  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const parts: Array<{ value: string; match: boolean }> = []
  let cursor = 0

  while (cursor < text.length) {
    const idx = lower.indexOf(needle, cursor)
    if (idx === -1) {
      parts.push({ value: text.slice(cursor), match: false })
      break
    }
    if (idx > cursor) {
      parts.push({ value: text.slice(cursor, idx), match: false })
    }
    parts.push({ value: text.slice(idx, idx + needle.length), match: true })
    cursor = idx + needle.length
  }

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="hl">
            {part.value}
          </mark>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  )
}
