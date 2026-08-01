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
 * Scroll `el` within a scrollable ancestor only — never the window.
 * Native scrollIntoView can pan the document on iOS and hide the capture bar.
 */
function scrollIntoScrollParent(el: HTMLElement): void {
  const parent = el.closest<HTMLElement>('.card__scroll, .board')
  if (!parent) return
  const parentRect = parent.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const pad = 8

  if (elRect.top < parentRect.top + pad) {
    parent.scrollTop += elRect.top - parentRect.top - pad
  } else if (elRect.bottom > parentRect.bottom - pad) {
    parent.scrollTop += elRect.bottom - parentRect.bottom + pad
  }
}

/** Keep the document viewport locked so the capture footer cannot scroll away. */
function lockDocumentScroll(): void {
  if (typeof window === 'undefined') return
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0)
  }
}

function scrollBoardToTarget(
  boardEl: HTMLElement,
  target: HTMLElement,
  align: 'nearest' | 'start',
): void {
  const boardRect = boardEl.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()

  if (align === 'start') {
    // Desktop columns: leading-edge X. Mobile stack: top-edge Y.
    const deltaX = targetRect.left - boardRect.left
    const deltaY = targetRect.top - boardRect.top - 8
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      boardEl.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' })
    }
    return
  }

  let left = 0
  let top = 0
  const deltaLeft = targetRect.left - boardRect.left
  const deltaRight = targetRect.right - boardRect.right
  if (deltaLeft < 0) left = deltaLeft - 12
  else if (deltaRight > 0) left = deltaRight + 12

  const deltaTop = targetRect.top - boardRect.top
  const deltaBottom = targetRect.bottom - boardRect.bottom
  if (deltaTop < 0) top = deltaTop - 8
  else if (deltaBottom > 0) top = deltaBottom + 8

  if (left !== 0 || top !== 0) {
    boardEl.scrollBy({ left, top, behavior: 'smooth' })
  }
}

/**
 * Scroll the board so a list/playlist card is visible.
 * Desktop: horizontal columns. Mobile-native: vertical stack.
 */
export function scrollCardIntoBoardView(
  cardId: string,
  opts: { align?: 'nearest' | 'start' } = {},
): boolean {
  if (typeof document === 'undefined') return false
  const cardEl = document.querySelector<HTMLElement>(
    `[data-card-id="${cssEscape(cardId)}"]`,
  )
  const boardEl = document.querySelector<HTMLElement>('.board')
  if (!cardEl || !boardEl) return false

  const align = opts.align ?? 'nearest'
  const colWrap = cardEl.closest<HTMLElement>('.board__col-wrap')
  const target = align === 'start' && colWrap ? colWrap : cardEl
  scrollBoardToTarget(boardEl, target, align)
  lockDocumentScroll()
  return true
}

/**
 * Scroll the board so the card is visible, then scroll/highlight the task.
 * Returns true when the task element was found and focused.
 */
export function scrollTaskIntoBoardView(
  taskId: string,
  opts: { highlightMs?: number; alignColumn?: 'nearest' | 'start' } = {},
): boolean {
  if (typeof document === 'undefined') return false
  const taskEl = document.querySelector<HTMLElement>(
    `[data-task-id="${cssEscape(taskId)}"]`,
  )
  if (!taskEl) return false

  const cardEl = taskEl.closest<HTMLElement>('.card')
  const boardEl = document.querySelector<HTMLElement>('.board')
  const align = opts.alignColumn ?? 'nearest'

  if (boardEl && cardEl) {
    const colWrap = cardEl.closest<HTMLElement>('.board__col-wrap')
    const target = align === 'start' && colWrap ? colWrap : cardEl
    scrollBoardToTarget(boardEl, target, align)
  }

  scrollIntoScrollParent(taskEl)
  lockDocumentScroll()

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
