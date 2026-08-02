import type { ReactNode } from 'react'
import { BackIcon } from './icons'

type Props = {
  title: string
  subtitle?: string
  /** Renders a leading back control instead of the app dot. */
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
}

/** Top bar of a tab screen: where you are, and what you can do from here. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions,
}: Props) {
  return (
    <header className="mos-topbar">
      {onBack && (
        <button
          type="button"
          className="mos-icon-btn mos-topbar__back"
          aria-label={backLabel}
          onClick={onBack}
        >
          <BackIcon />
        </button>
      )}

      <div className="mos-topbar__text">
        <h1 className="mos-topbar__title">{title}</h1>
        {subtitle && <p className="mos-topbar__subtitle">{subtitle}</p>}
      </div>

      {actions && <div className="mos-topbar__actions">{actions}</div>}
    </header>
  )
}
