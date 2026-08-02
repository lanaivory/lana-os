import { useEffect, type ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Secondary sheets stack above an already-open one. */
  layer?: 'base' | 'stacked'
}

/** Bottom sheet: the one modal surface the mobile app uses. */
export function Sheet({
  open,
  title,
  onClose,
  children,
  layer = 'base',
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`mos-sheet mos-sheet--${layer}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="mos-sheet__scrim"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="mos-sheet__panel">
        <div className="mos-sheet__grip" aria-hidden />
        <header className="mos-sheet__head">
          <h2 className="mos-sheet__title">{title}</h2>
          <button
            type="button"
            className="mos-sheet__close"
            onClick={onClose}
            aria-label="Close"
          >
            Done
          </button>
        </header>
        <div className="mos-sheet__body">{children}</div>
      </div>
    </div>
  )
}

export function SheetGroup({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <section className="mos-sheet__group">
      {label && <h3 className="mos-sheet__group-title">{label}</h3>}
      {children}
    </section>
  )
}

export function SheetAction({
  label,
  hint,
  tone = 'default',
  disabled = false,
  onClick,
}: {
  label: string
  hint?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`mos-sheet__action mos-sheet__action--${tone}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="mos-sheet__action-label">{label}</span>
      {hint && <span className="mos-sheet__action-hint">{hint}</span>}
    </button>
  )
}
