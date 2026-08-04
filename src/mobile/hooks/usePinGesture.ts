import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/** How far right a row must travel before releasing it toggles the pin. */
const COMMIT_PX = 60
/** The row stops following past this, so the name never leaves the screen. */
const MAX_PX = 92
/** A gesture counts as horizontal only when it clearly out-runs its drift. */
const AXIS_RATIO = 1.6

/**
 * Flick a list row to the right to pin or unpin it. The row follows the finger
 * and reports how far it has come, so the glyph behind it can say what letting
 * go will do — the gesture used to happen entirely in the dark.
 *
 * Holding is not used here: that is how a row is picked up for dragging. Never
 * calls `preventDefault`, so vertical scrolling stays native.
 */
export function usePinGesture(onPin: () => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  // Read on release instead of the rendered offset, so a dropped re-render
  // cannot swallow the last pixels of travel.
  const travelled = useRef(0)
  const fired = useRef(false)
  const [offset, setOffset] = useState(0)

  const reset = () => {
    start.current = null
    travelled.current = 0
    setOffset(0)
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return
    fired.current = false
    travelled.current = 0
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const from = start.current
    if (!from || from.id !== event.pointerId) return

    const dx = event.clientX - from.x
    const dy = Math.abs(event.clientY - from.y)
    const next = dx > 0 && dx > dy * AXIS_RATIO ? Math.min(dx, MAX_PX) : 0
    travelled.current = next
    setOffset(next)
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const from = start.current
    const distance = travelled.current
    reset()
    if (!from || from.id !== event.pointerId) return
    if (distance < COMMIT_PX) return
    fired.current = true
    onPin()
  }

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
    },
    /** How far the row has been pulled, in pixels. */
    offset,
    /** True once letting go would commit, so the glyph can light up. */
    armed: offset >= COMMIT_PX,
    /** True when the gesture already acted, so the tap should not also open. */
    consumedTap: () => fired.current,
  }
}
