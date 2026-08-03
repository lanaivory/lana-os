import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_RIGHT_PX = 56
/** A gesture counts as horizontal only when it clearly out-runs its drift. */
const AXIS_RATIO = 1.6

/**
 * Flick a list to the right to pin it. Holding is not used here — that is how
 * a row is picked up for dragging. Never calls `preventDefault`, so scrolling
 * stays native.
 */
export function usePinGesture(onPin: () => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    start.current = null
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse') return
    fired.current = false
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const from = start.current
    cancel()
    if (!from || from.id !== event.pointerId) return
    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    if (dx > SWIPE_RIGHT_PX && Math.abs(dx) > Math.abs(dy) * AXIS_RATIO) {
      fired.current = true
      onPin()
    }
  }

  return {
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel: cancel,
    },
    /** True when the gesture already acted, so the tap should not also open. */
    consumedTap: () => fired.current,
  }
}
