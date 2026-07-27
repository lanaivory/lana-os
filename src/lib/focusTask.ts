import { findPlaylistContaining } from './board'
import type { AppState } from './types'

/** Card id that currently shows the task (playlist wins over context list). */
export function cardIdForTask(state: AppState, taskId: string): string | null {
  const task = state.tasks[taskId]
  if (!task) return null
  const playlist = findPlaylistContaining(state, taskId)
  if (playlist) return playlist
  return task.listId
}

export function readFocusTaskId(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): string | null {
  try {
    const params = new URLSearchParams(search)
    const focus = params.get('focus')?.trim()
    return focus || null
  } catch {
    return null
  }
}

/** Remove focus from the URL without reloading. */
export function clearFocusFromUrl(): void {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('focus')) return
    url.searchParams.delete('focus')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(window.history.state, '', next)
  } catch {
    // ignore
  }
}

/**
 * Horizontally scroll the board so the card is visible, then scroll/highlight the task.
 * Returns true when the task element was found and focused.
 */
export function scrollTaskIntoBoardView(
  taskId: string,
  opts: { highlightMs?: number } = {},
): boolean {
  if (typeof document === 'undefined') return false
  const taskEl = document.querySelector<HTMLElement>(
    `[data-task-id="${cssEscape(taskId)}"]`,
  )
  if (!taskEl) return false

  const cardEl = taskEl.closest<HTMLElement>('.card')
  const boardEl = document.querySelector<HTMLElement>('.board')

  if (boardEl && cardEl) {
    const boardRect = boardEl.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    const deltaLeft = cardRect.left - boardRect.left
    const deltaRight = cardRect.right - boardRect.right
    if (deltaLeft < 0) {
      boardEl.scrollBy({ left: deltaLeft - 12, behavior: 'smooth' })
    } else if (deltaRight > 0) {
      boardEl.scrollBy({ left: deltaRight + 12, behavior: 'smooth' })
    }
  }

  taskEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })

  const ms = opts.highlightMs ?? 2200
  taskEl.classList.add('is-focus-flash')
  window.setTimeout(() => {
    taskEl.classList.remove('is-focus-flash')
  }, ms)

  return true
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/["\\]/g, '\\$&')
}
