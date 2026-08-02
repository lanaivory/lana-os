import { usePushNotifications } from '../../hooks/usePushNotifications'
import { isStandaloneDisplay } from '../../lib/webPushClient'
import { contactCardHref } from '../../lib/captureNumber'

type Props = {
  captureNumber: string
  onDone: () => void
}

/**
 * First run, three things and nothing else: know where to text, allow the one
 * notification that matters, and install the app so it can arrive.
 */
export function Onboarding({ captureNumber, onDone }: Props) {
  const { state: pushState, enable } = usePushNotifications()
  const installed = isStandaloneDisplay()

  return (
    <div className="mos-scroll mos-onboard">
      <header className="mos-onboard__head">
        <h1 className="mos-onboard__title">Set up Lana OS</h1>
        <p className="mos-note">Three quick things, then you are done.</p>
      </header>

      <section className="mos-onboard__step">
        <h2 className="mos-onboard__step-title">1 · Save the capture number</h2>
        <p className="mos-note">
          {captureNumber
            ? `Text your to-dos to ${captureNumber} and they file themselves.`
            : 'No inbound number is configured yet. You can add one in Settings.'}
        </p>
        {captureNumber && (
          <a
            className="mos-btn mos-btn--accent"
            href={contactCardHref(captureNumber)}
            download="Lana OS.vcf"
          >
            Save as a contact
          </a>
        )}
      </section>

      <section className="mos-onboard__step">
        <h2 className="mos-onboard__step-title">2 · Turn on notifications</h2>
        <p className="mos-note">
          So a reminder can reach you when the app is closed. That is the only
          thing notifications are used for.
        </p>
        <button
          type="button"
          className={`mos-btn${pushState === 'enabled' ? ' mos-btn--on' : ''}`}
          disabled={pushState !== 'default'}
          onClick={() => void enable()}
        >
          {pushState === 'enabled'
            ? 'Notifications on'
            : pushState === 'needs-install'
              ? 'Add to Home Screen first'
              : pushState === 'denied'
                ? 'Blocked in system settings'
                : 'Allow notifications'}
        </button>
      </section>

      <section className="mos-onboard__step">
        <h2 className="mos-onboard__step-title">3 · Add to Home Screen</h2>
        <p className="mos-note">
          {installed
            ? 'Already installed — you are running from the Home Screen icon.'
            : 'In Safari, tap Share → Add to Home Screen, then open Lana OS from the icon.'}
        </p>
      </section>

      <button type="button" className="mos-btn mos-btn--accent" onClick={onDone}>
        Start using Lana OS
      </button>
    </div>
  )
}
