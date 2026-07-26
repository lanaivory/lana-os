type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="modal__backdrop"
        onClick={onCancel}
        aria-label="Close"
      />
      <div className="modal__panel modal__panel--confirm">
        <header className="modal__head">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onCancel}>
            ✕
          </button>
        </header>
        <div className="modal__body">
          <p>{message}</p>
          <div className="confirm-actions">
            <button type="button" className="topbar__btn" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`topbar__btn ${danger ? 'topbar__btn--danger' : 'topbar__btn--accent'}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
