const REVEAL_CLASS = 'is-revealed'
const SCROLL_PADDING_PX = 12

function escapeId(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, '\\$&')
}

/**
 * Scroll a task row into view inside the mobile scroller and flash it.
 * Scoped to the given container: it never touches the document scroll
 * position, which on iOS would slide the capture bar off-screen.
 */
export function revealTaskInContainer(
  container: HTMLElement | null,
  taskId: string,
  opts: { highlightMs?: number } = {},
): boolean {
  if (!container) return false

  const row = container.querySelector<HTMLElement>(
    `[data-mos-task="${escapeId(taskId)}"]`,
  )
  if (!row) return false

  const containerBox = container.getBoundingClientRect()
  const rowBox = row.getBoundingClientRect()

  if (rowBox.top < containerBox.top + SCROLL_PADDING_PX) {
    container.scrollBy({
      top: rowBox.top - containerBox.top - SCROLL_PADDING_PX,
      behavior: 'smooth',
    })
  } else if (rowBox.bottom > containerBox.bottom - SCROLL_PADDING_PX) {
    container.scrollBy({
      top: rowBox.bottom - containerBox.bottom + SCROLL_PADDING_PX,
      behavior: 'smooth',
    })
  }

  row.classList.add(REVEAL_CLASS)
  window.setTimeout(() => {
    row.classList.remove(REVEAL_CLASS)
  }, opts.highlightMs ?? 2400)

  return true
}
