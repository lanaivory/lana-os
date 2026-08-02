const REVEAL_CLASS = 'is-revealed'
const SCROLL_PADDING_PX = 12

function escapeId(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, '\\$&')
}

/**
 * Scroll a task row into view and flash it. Scrolling is confined to the
 * screen's own scroller, never the document: on iOS a document scroll would
 * slide the capture bar and tab bar off-screen.
 */
export function revealTask(
  root: HTMLElement | null,
  taskId: string,
  opts: { highlightMs?: number } = {},
): boolean {
  if (!root) return false

  const row = root.querySelector<HTMLElement>(
    `[data-mos-task="${escapeId(taskId)}"]`,
  )
  if (!row) return false

  const scroller = row.closest<HTMLElement>('.mos-scroll')
  if (scroller) {
    const scrollerBox = scroller.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()

    if (rowBox.top < scrollerBox.top + SCROLL_PADDING_PX) {
      scroller.scrollBy({
        top: rowBox.top - scrollerBox.top - SCROLL_PADDING_PX,
        behavior: 'smooth',
      })
    } else if (rowBox.bottom > scrollerBox.bottom - SCROLL_PADDING_PX) {
      scroller.scrollBy({
        top: rowBox.bottom - scrollerBox.bottom + SCROLL_PADDING_PX,
        behavior: 'smooth',
      })
    }
  }

  row.classList.add(REVEAL_CLASS)
  window.setTimeout(() => {
    row.classList.remove(REVEAL_CLASS)
  }, opts.highlightMs ?? 2400)

  return true
}
