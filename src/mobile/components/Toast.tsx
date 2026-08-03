import { useEffect, useRef } from 'react'

type Props = {
  message: string | null
  /** Changes per toast, so two identical messages still restart the countdown. */
  token?: number
  /**
   * `bar` carries an action. `pill` is a bare confirmation, for when the thing
   * you just did landed somewhere you cannot see.
   */
  variant?: 'bar' | 'pill'
  actionLabel?: string
  durationMs?: number
  onAction: () => void
  onDismiss: () => void
}

/** Brief confirmation with one way back, for actions that would otherwise vanish. */
export function Toast({
  message,
  token = 0,
  variant = 'bar',
  actionLabel = 'Undo',
  durationMs = 4500,
  onAction,
  onDismiss,
}: Props) {
  // Read through a ref so a caller re-rendering (the clock ticks every 30s)
  // cannot keep restarting the countdown and pin the toast on screen.
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => dismiss.current(), durationMs)
    return () => window.clearTimeout(timer)
  }, [message, token, durationMs])

  if (!message) return null

  if (variant === 'pill') {
    return (
      <div className="mos-toast mos-toast--pill" role="status">
        <span className="mos-toast__text">{message}</span>
      </div>
    )
  }

  return (
    <div className="mos-toast" role="status">
      <span className="mos-toast__text">{message}</span>
      <button
        type="button"
        className="mos-toast__action"
        onClick={() => {
          onAction()
          onDismiss()
        }}
      >
        {actionLabel}
      </button>
    </div>
  )
}
