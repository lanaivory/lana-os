import { useEffect, useRef, useState, type RefObject } from 'react'

const AXIS_THRESHOLD_PX = 8
const PINCH_ZOOM_OUT_RATIO = 0.88
const PINCH_ZOOM_IN_RATIO = 1.12
const SNAP_BACK_SHOW_PX = 48

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
  },
) {
  const { boardZoomOut, onBoardZoomOutChange } = opts
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

    const snapBoardToNearestColumn = () => {
      const cols = [...board.querySelectorAll('.board__col-wrap')].filter(
        (node): node is HTMLElement => node instanceof HTMLElement,
      )
      if (!cols.length) return
      const origin = board.getBoundingClientRect().left
      let bestEl: HTMLElement | null = null
      let bestDist = Infinity
      for (const node of cols) {
        const dist = Math.abs(node.getBoundingClientRect().left - origin)
        if (dist < bestDist) {
          bestDist = dist
          bestEl = node
        }
      }
      if (!bestEl || bestDist < 2) return
      const delta = bestEl.getBoundingClientRect().left - origin
      board.scrollBy({ left: delta, behavior: 'smooth' })
    }

    const endAxis = () => {
      const axis = axisSession?.axis
      const pannedBoard = axis === 'x' && !axisSession?.titleEl
      axisSession = null
      board.dataset.axisLock = ''
      if (pannedBoard) {
        // Re-enable snap and settle on the nearest column after a manual pan.
        requestAnimationFrame(() => snapBoardToNearestColumn())
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
  }, [boardRef])

  const snapBackToStart = () => {
    const board = boardRef.current
    if (!board) return
    board.scrollTo({ left: 0, behavior: 'smooth' })
  }

  return { showSnapBack, snapBackToStart }
}
