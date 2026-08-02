import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const MIN_DISTANCE_PX = 48
/** A gesture counts as horizontal only when it clearly out-runs its drift. */
const AXIS_RATIO = 1.6

type Options = {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

/**
 * Detects horizontal swipes without ever calling `preventDefault`, so vertical
 * page scrolling stays entirely native.
 */
export function useHorizontalSwipe({ onSwipeLeft, onSwipeRight }: Options) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse') return
    start.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
    }
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const from = start.current
    start.current = null
    if (!from || from.id !== event.pointerId) return

    const dx = event.clientX - from.x
    const dy = event.clientY - from.y
    if (Math.abs(dx) < MIN_DISTANCE_PX) return
    if (Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) return

    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  const onPointerCancel = () => {
    start.current = null
  }

  return { onPointerDown, onPointerUp, onPointerCancel }
}
