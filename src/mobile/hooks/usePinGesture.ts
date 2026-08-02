import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const LONG_PRESS_MS = 480
const SWIPE_RIGHT_PX = 56
const SLOP_PX = 12

/**
 * Two ways to pin a list without adding a control to every row: hold it, or
 * flick it to the right. Never calls `preventDefault`, so scrolling is native.
 */
export function usePinGesture(onPin: () => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const timer = useRef(0)
  const fired = useRef(false)

  const cancel = () => {
    window.clearTimeout(timer.current)
    start.current = null
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse') return
    fired.current = false
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    timer.current = window.setTimeout(() => {
      if (!start.current) return
      fired.current = true
      onPin()
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const from = start.current
    if (!from || from.id !== event.pointerId) return
    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    if (Math.abs(dx) > SLOP_PX || Math.abs(dy) > SLOP_PX) {
      window.clearTimeout(timer.current)
    }
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const from = start.current
    cancel()
    if (!from || from.id !== event.pointerId) return
    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    if (dx > SWIPE_RIGHT_PX && Math.abs(dx) > Math.abs(dy) * 1.6) {
      fired.current = true
      onPin()
    }
  }

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: cancel,
    },
    /** True when the gesture already acted, so the tap should not also open. */
    consumedTap: () => fired.current,
  }
}
