import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/** Pull right this far and letting go completes the row. */
const COMPLETE_PX = 60
/** Pull left this far and letting go leaves the row's actions open. */
const REVEAL_PX = 44
/** The row stops following past this, so its title never leaves the screen. */
const MAX_RIGHT_PX = 96
/** A gesture counts as horizontal only when it clearly out-runs its drift. */
const AXIS_RATIO = 1.6
/** Under this, the finger was tapping and merely wobbled on the way. */
const DEAD_ZONE_PX = 6

export type RowSwipeArmed = 'complete' | 'actions' | null

type Options = {
  /** Committed by a swipe to the right. */
  onComplete: () => void
  /** True while this row's actions are held open. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** How far left the row rests while its actions are open. */
  openPx: number
  disabled?: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * The two things a row can do to itself, without a sheet in the way: pull it
 * right to complete it, or pull it left to uncover Move and Delete.
 *
 * The row follows the finger the whole way and reports which action letting go
 * would commit, so the label underneath can say so before you release. An
 * already-open row only decides whether it closes, which keeps a second flick
 * from firing something you were only trying to put away.
 *
 * Never calls `preventDefault`: the row claims the horizontal axis with
 * `touch-action`, so vertical scrolling stays native.
 */
export function useRowSwipe({
  onComplete,
  open,
  onOpenChange,
  openPx,
  disabled = false,
}: Options) {
  const start = useRef<{ x: number; y: number; id: number; open: boolean } | null>(
    null,
  )
  // Read on release rather than the rendered offset, so a dropped re-render
  // cannot swallow the last pixels of travel.
  const travelled = useRef<number | null>(null)
  const fired = useRef(false)
  const [dragOffset, setDragOffset] = useState<number | null>(null)

  const restingOffset = open ? -openPx : 0
  const offset = dragOffset ?? restingOffset

  const reset = () => {
    start.current = null
    travelled.current = null
    setDragOffset(null)
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    if (disabled || event.pointerType === 'mouse' || !event.isPrimary) return
    fired.current = false
    travelled.current = null
    start.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      open,
    }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const from = start.current
    if (!from || from.id !== event.pointerId) return
    // A hold has become a drag-to-reorder; that gesture owns the pointer now.
    if (disabled) {
      reset()
      return
    }

    const base = from.open ? -openPx : 0
    const dx = event.clientX - from.x
    const dy = Math.abs(event.clientY - from.y)
    if (Math.abs(dx) < DEAD_ZONE_PX || Math.abs(dx) < dy * AXIS_RATIO) {
      travelled.current = null
      setDragOffset(null)
      return
    }

    // A little give past the resting position, but an open row cannot be pulled
    // further right than shut.
    const next = clamp(
      base + dx,
      -(openPx + 20),
      from.open ? 0 : MAX_RIGHT_PX,
    )
    travelled.current = next
    setDragOffset(next)
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    const from = start.current
    const distance = travelled.current
    reset()
    if (!from || from.id !== event.pointerId) return
    if (disabled) {
      // The drag that took the pointer also owns the release, so the tap it
      // would otherwise fire is spent here rather than opening the task.
      fired.current = true
      return
    }
    if (distance === null) return

    if (from.open) {
      // From an open row the gesture only decides whether it stays open.
      onOpenChange(distance <= -openPx / 2)
      fired.current = true
      return
    }
    if (distance >= COMPLETE_PX) {
      fired.current = true
      onComplete()
      return
    }
    if (distance <= -REVEAL_PX) {
      fired.current = true
      onOpenChange(true)
    }
  }

  const armed: RowSwipeArmed =
    dragOffset === null
      ? null
      : dragOffset >= COMPLETE_PX
        ? 'complete'
        : dragOffset <= -REVEAL_PX
          ? 'actions'
          : null

  return {
    offset,
    /** True while the finger is still on the row, so it should not glide. */
    swiping: dragOffset !== null,
    /** Which action letting go would commit right now. */
    armed,
    /** True when the gesture already acted, so the tap must not also open. */
    consumedTap: () => fired.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: reset,
    },
  }
}
