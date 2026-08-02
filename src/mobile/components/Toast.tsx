import { useEffect } from 'react'

type Props = {
  message: string | null
  actionLabel?: string
  durationMs?: number
  onAction: () => void
  onDismiss: () => void
}

/** Brief confirmation with one way back, for actions that would otherwise vanish. */
export function Toast({
  message,
  actionLabel = 'Undo',
  durationMs = 4500,
  onAction,
  onDismiss,
}: Props) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, durationMs, onDismiss])

  if (!message) return null

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
