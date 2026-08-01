import { useEffect, useRef, useState, type RefObject } from 'react'

const AXIS_THRESHOLD_PX = 8
const PINCH_ZOOM_OUT_RATIO = 0.88
const PINCH_ZOOM_IN_RATIO = 1.12
const SNAP_BACK_SHOW_PX = 48
/** Finger travel needed to commit to the next/previous column on release. */
const SNAP_COMMIT_PX = 48

type Axis = 'x' | 'y'

type AxisSession = {
  startX: number
  startY: number
  axis: Axis | null
  boardScrollLeft: number
  boardScrollTop: number
  verticalEl: HTMLElement | null
  verticalScrollTop: number
  titleEl: HTMLElement | null
  titleScrollLeft: number
  lastDx: number
}

type PinchSession = {
  startDistance: number
  applied: boolean
}

function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.hypot(dx, dy)
}

function closestScrollableTitle(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const main = target.closest('.task__main')
  if (!(main instanceof HTMLElement)) return null
  if (main.scrollWidth > main.clientWidth + 1) return main
  return null
}

function closestCardScroll(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const el = target.closest('.card__scroll')
  return el instanceof HTMLElement ? el : null
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, button, a, [data-drag-handle], .task__drag, .card__drag, .resize-handle, .width-handle',
    ),
  )
}

function boardColumns(board: HTMLElement): HTMLElement[] {
  return [...board.querySelectorAll('.board__col-wrap')].filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  )
}

/**
 * Mobile board gestures: one-axis scroll lock, pinch zoom, and scroll-back visibility.
 * Desktop behavior is unchanged (listeners only attach on coarse pointers / touch).
 * Pinch is the only gesture path that changes zoom — taps/scrolls never touch it.
 */
export function useBoardGestures(
  boardRef: RefObject<HTMLElement | null>,
  opts: {
    boardZoomOut: boolean
    onBoardZoomOutChange: (zoomOut: boolean) => void
    /** When false (mobile-native single-list), skip multi-column gestures. */
    enabled?: boolean
  },
) {
  const { boardZoomOut, onBoardZoomOutChange, enabled = true } = opts
  const [showSnapBack, setShowSnapBack] = useState(false)
  const zoomOutRef = useRef(boardZoomOut)
  const onZoomRef = useRef(onBoardZoomOutChange)

  useEffect(() => {
    zoomOutRef.current = boardZoomOut
  }, [boardZoomOut])

  useEffect(() => {
    onZoomRef.current = onBoardZoomOutChange
  }, [onBoardZoomOutChange])

  useEffect(() => {
    if (!enabled) {
      setShowSnapBack(false)
      return
    }
    const board = boardRef.current
    if (!board) return

    // Prefer touch devices; keep mouse/trackpad desktop behavior native.
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)')
    if (!coarse.matches && !('ontouchstart' in window)) {
      const syncSnapBackDesktop = () => {
        setShowSnapBack(board.scrollLeft > SNAP_BACK_SHOW_PX)
      }
      board.addEventListener('scroll', syncSnapBackDesktop, { passive: true })
      syncSnapBackDesktop()
      return () => board.removeEventListener('scroll', syncSnapBackDesktop)
    }

    let axisSession: AxisSession | null = null
    let pinchSession: PinchSession | null = null

    const syncSnapBack = () => {
      setShowSnapBack(board.scrollLeft > SNAP_BACK_SHOW_PX)
    }

    /**
     * Settle onto a column leading edge after an axis-locked pan.
     * Uses swipe direction so back-swipes move column-by-column (and can reach
     * scrollLeft 0) instead of getting stuck between snap points.
     */
    const snapBoardAfterPan = (startScrollLeft: number, panDx: number) => {
      const cols = boardColumns(board)
      if (!cols.length) return

      // Leading-edge origin matches CSS scroll-padding-left: 0.
      const origin = board.getBoundingClientRect().left
      const scrollDelta = board.scrollLeft - startScrollLeft

      let startIdx = 0
      let startDist = Infinity
      for (let i = 0; i < cols.length; i++) {
        const leftAtStart =
          cols[i].getBoundingClientRect().left + scrollDelta - origin
        const dist = Math.abs(leftAtStart)
        if (dist < startDist) {
          startDist = dist
          startIdx = i
        }
      }

      const colWidth = cols[startIdx]?.getBoundingClientRect().width ?? 300
      const threshold = Math.min(SNAP_COMMIT_PX, Math.max(36, colWidth * 0.15))

      let targetIdx = startIdx
      if (panDx <= -threshold) {
        // Finger left → later columns.
        targetIdx = Math.min(cols.length - 1, startIdx + 1)
      } else if (panDx >= threshold) {
        // Finger right → toward the playlist / first column.
        targetIdx = Math.max(0, startIdx - 1)
      }

      // First column: always land exactly at the leftmost edge.
      if (targetIdx === 0) {
        if (board.scrollLeft > 1) {
          board.scrollTo({ left: 0, behavior: 'smooth' })
        }
        return
      }

      const target = cols[targetIdx]
      const delta = target.getBoundingClientRect().left - origin
      if (Math.abs(delta) < 2) return
      const absoluteLeft = Math.max(0, board.scrollLeft + delta)
      board.scrollTo({ left: absoluteLeft, behavior: 'smooth' })
    }

    const endAxis = () => {
      const axis = axisSession?.axis
      const pannedBoard = axis === 'x' && !axisSession?.titleEl
      const panDx = axisSession?.lastDx ?? 0
      const startScrollLeft = axisSession?.boardScrollLeft ?? board.scrollLeft
      axisSession = null
      board.dataset.axisLock = ''
      if (pannedBoard) {
        // Re-enable snap and settle on a column leading edge after a manual pan.
        requestAnimationFrame(() => snapBoardAfterPan(startScrollLeft, panDx))
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        axisSession = null
        board.dataset.axisLock = ''
        pinchSession = {
          startDistance: touchDistance(event.touches[0], event.touches[1]),
          applied: false,
        }
        return
      }

      if (event.touches.length !== 1) return
      // A second finger ending / extra touches must not clear an intentional zoom.
      if (isInteractiveTarget(event.target)) {
        axisSession = null
        return
      }

      pinchSession = null
      const touch = event.touches[0]
      const titleEl = closestScrollableTitle(event.target)
      const verticalEl = closestCardScroll(event.target)

      axisSession = {
        startX: touch.clientX,
        startY: touch.clientY,
        axis: null,
        boardScrollLeft: board.scrollLeft,
        boardScrollTop: board.scrollTop,
        verticalEl,
        verticalScrollTop: verticalEl?.scrollTop ?? 0,
        titleEl,
        titleScrollLeft: titleEl?.scrollLeft ?? 0,
        lastDx: 0,
      }
      board.dataset.axisLock = ''
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchSession) {
        event.preventDefault()
        if (pinchSession.applied) return
        const distance = touchDistance(event.touches[0], event.touches[1])
        if (pinchSession.startDistance < 16) return
        const ratio = distance / pinchSession.startDistance
        if (ratio <= PINCH_ZOOM_OUT_RATIO) {
          pinchSession.applied = true
          if (!zoomOutRef.current) onZoomRef.current(true)
        } else if (ratio >= PINCH_ZOOM_IN_RATIO) {
          pinchSession.applied = true
          if (zoomOutRef.current) onZoomRef.current(false)
        }
        return
      }

      if (!axisSession || event.touches.length !== 1) return

      const touch = event.touches[0]
      const dx = touch.clientX - axisSession.startX
      const dy = touch.clientY - axisSession.startY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)

      if (!axisSession.axis) {
        if (absX < AXIS_THRESHOLD_PX && absY < AXIS_THRESHOLD_PX) return
        axisSession.axis = absX > absY ? 'x' : 'y'
        board.dataset.axisLock = axisSession.axis
      }

      // Take over scrolling so the browser cannot diagonal-pan both axes.
      event.preventDefault()

      if (axisSession.axis === 'x') {
        axisSession.lastDx = dx
        if (axisSession.titleEl) {
          const el = axisSession.titleEl
          const max = Math.max(0, el.scrollWidth - el.clientWidth)
          const next = axisSession.titleScrollLeft - dx
          el.scrollLeft = Math.max(0, Math.min(max, next))
          const overflow =
            next < 0 ? next : next > max ? next - max : 0
          if (overflow !== 0) {
            board.scrollLeft = axisSession.boardScrollLeft - overflow
          }
        } else {
          board.scrollLeft = axisSession.boardScrollLeft - dx
        }
        return
      }

      if (axisSession.verticalEl) {
        axisSession.verticalEl.scrollTop = axisSession.verticalScrollTop - dy
      } else {
        board.scrollTop = axisSession.boardScrollTop - dy
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchSession = null
      if (event.touches.length === 0) endAxis()
    }

    // Touch listeners only fire for real touches — desktop mouse/trackpad stays native.
    board.addEventListener('touchstart', onTouchStart, { passive: true })
    board.addEventListener('touchmove', onTouchMove, { passive: false })
    board.addEventListener('touchend', onTouchEnd)
    board.addEventListener('touchcancel', onTouchEnd)
    board.addEventListener('scroll', syncSnapBack, { passive: true })
    syncSnapBack()

    return () => {
      board.removeEventListener('touchstart', onTouchStart)
      board.removeEventListener('touchmove', onTouchMove)
      board.removeEventListener('touchend', onTouchEnd)
      board.removeEventListener('touchcancel', onTouchEnd)
      board.removeEventListener('scroll', syncSnapBack)
      endAxis()
    }
  }, [boardRef, enabled])

  const snapBackToStart = () => {
    const board = boardRef.current
    if (!board) return
    board.scrollTo({ left: 0, behavior: 'smooth' })
  }

  return { showSnapBack, snapBackToStart }
}
