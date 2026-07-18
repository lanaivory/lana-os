type Props = {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Settings">
      <button type="button" className="modal__backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal__panel">
        <header className="modal__head">
          <h2>Settings</h2>
          <button type="button" className="ghost" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal__body">
          <p>
            Lana OS is local-first. Everything stays in this browser under{' '}
            <code>lana-os:v1</code>.
          </p>
          <ul>
            <li>Tasks live once in context lists</li>
            <li>Today / Tomorrow / This Week hold references only</li>
            <li>Completed tasks auto-clear after one hour</li>
            <li>Tomorrow rolls into Today each morning</li>
          </ul>
          <p className="modal__hint">
            Tip: drag any task into Today or Tomorrow to plan. Use ⌘K to find.
          </p>
        </div>
      </div>
    </div>
  )
}
