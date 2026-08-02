import { Sheet } from './Sheet'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Sheet open={open} title={title} onClose={onCancel} layer="stacked">
      <p className="mos-sheet__message">{message}</p>
      <div className="mos-confirm">
        <button type="button" className="mos-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="mos-btn mos-btn--danger"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
