import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Pinned under the body: the sheet's commit and destroy actions. */
  footer?: ReactNode
  /** Secondary sheets stack above an already-open one. */
  layer?: 'base' | 'stacked'
}

/** Bottom sheet: the one modal surface the mobile app uses. */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
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
            <CloseIcon />
          </button>
        </header>
        <div className="mos-sheet__body">{children}</div>
        {footer && <div className="mos-sheet__foot">{footer}</div>}
      </div>
    </div>
  )
}
