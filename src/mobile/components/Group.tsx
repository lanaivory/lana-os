import type { ReactNode } from 'react'

/** Titled block of rows. Used by both full screens and bottom sheets. */
export function Group({
  label,
  hint,
  children,
}: {
  label?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="mos-group">
      {label && <h3 className="mos-group__title">{label}</h3>}
      {children}
      {hint && <p className="mos-note">{hint}</p>}
    </section>
  )
}

/** Tappable row: label, optional hint underneath, optional trailing content. */
export function Row({
  label,
  hint,
  tone = 'default',
  disabled = false,
  selected = false,
  trailing,
  onClick,
}: {
  label: string
  hint?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  selected?: boolean
  trailing?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`mos-row mos-row--${tone}${selected ? ' is-selected' : ''}`}
      disabled={disabled}
      aria-pressed={selected || undefined}
      onClick={onClick}
    >
      <span className="mos-row__text">
        <span className="mos-row__label">{label}</span>
        {hint && <span className="mos-row__hint">{hint}</span>}
      </span>
      {trailing && <span className="mos-row__trailing">{trailing}</span>}
    </button>
  )
}
