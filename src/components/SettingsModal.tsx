import { NotifyBell } from './NotifyBell'

type Props = {
  open: boolean
  onClose: () => void
  wrapTaskTitles: boolean
  onWrapTaskTitlesChange: (value: boolean) => void
  textCaptureConnected?: boolean
  textCaptureChecking?: boolean
  onCheckTexts?: () => void
}

export function SettingsModal({
  open,
  onClose,
  wrapTaskTitles,
  onWrapTaskTitlesChange,
  textCaptureConnected = false,
  textCaptureChecking = false,
  onCheckTexts,
}: Props) {
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
          <section className="settings-section">
            <h3 className="settings-section__title">Notifications</h3>
            <p className="settings-section__desc">
              Get a phone alert when a to-do is captured from a text. Once enabled,
              it stays on.
            </p>
            <NotifyBell variant="settings" />
          </section>

          <section className="settings-section">
            <h3 className="settings-section__title">Text capture</h3>
            <p className="settings-section__desc">
              {textCaptureConnected
                ? 'Connected — new texts are pulled automatically every couple of minutes.'
                : 'Inbox polling runs in the background when configured.'}
            </p>
            {onCheckTexts && (
              <button
                type="button"
                className="settings-btn"
                onClick={() => onCheckTexts()}
                disabled={textCaptureChecking}
              >
                {textCaptureChecking ? 'Checking…' : 'Check now'}
              </button>
            )}
          </section>

          <section className="settings-section">
            <h3 className="settings-section__title">Task titles</h3>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={wrapTaskTitles}
                onChange={(e) => onWrapTaskTitlesChange(e.target.checked)}
              />
              <span>Wrap task titles onto multiple lines</span>
            </label>
            <p className="settings-section__desc">
              When off, each title stays on one line and scrolls horizontally inside
              its row (lists and Today / Tomorrow / This Week).
            </p>
          </section>

          <section className="settings-section settings-section--muted">
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
          </section>
        </div>
      </div>
    </div>
  )
}
