import { MoreIcon, UndoIcon } from './icons'

type Props = {
  liveClock: string
  canUndo: boolean
  textCaptureConnected: boolean
  onUndo: () => void
  onOpenMenu: () => void
}

export function MobileHeader({
  liveClock,
  canUndo,
  textCaptureConnected,
  onUndo,
  onOpenMenu,
}: Props) {
  return (
    <header className="mos-header">
      <div className="mos-header__brand">
        <h1 className="mos-header__title">Lana OS</h1>
        <span className="mos-header__clock">{liveClock}</span>
        {textCaptureConnected && (
          <span
            className="mos-header__status"
            title="Text capture connected"
            aria-label="Text capture connected"
          />
        )}
      </div>

      <div className="mos-header__actions">
        <button
          type="button"
          className="mos-icon-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="mos-icon-btn"
          onClick={onOpenMenu}
          aria-label="Menu"
        >
          <MoreIcon />
        </button>
      </div>
    </header>
  )
}
