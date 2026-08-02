import { usePushNotifications } from '../../hooks/usePushNotifications'
import type { PushUiState } from '../../lib/webPushClient'
import { Sheet, SheetGroup } from './Sheet'

const PUSH_LABELS: Record<PushUiState, string> = {
  enabled: 'Notifications on',
  denied: 'Blocked in system settings',
  'needs-install': 'Add to Home Screen first',
  unsupported: 'Not supported on this browser',
  busy: 'Working…',
  default: 'Enable notifications',
}

const PUSH_HINTS: Record<PushUiState, string> = {
  enabled: 'You will get a phone alert whenever a text is captured.',
  denied:
    'Notifications are blocked. Turn them back on for Lana OS in system settings.',
  'needs-install':
    'On iPhone, use Share → Add to Home Screen, then open Lana OS from the icon.',
  unsupported: 'This browser cannot receive web push notifications.',
  busy: 'Talking to the push service…',
  default: 'Get a phone alert when a to-do arrives by text.',
}

type Props = {
  open: boolean
  sortTodayByTime: boolean
  textCaptureConnected: boolean
  textCaptureChecking: boolean
  onClose: () => void
  onSortTodayByTimeChange: (value: boolean) => void
  onCheckTexts: () => void
}

export function SettingsSheet({
  open,
  sortTodayByTime,
  textCaptureConnected,
  textCaptureChecking,
  onClose,
  onSortTodayByTimeChange,
  onCheckTexts,
}: Props) {
  const push = usePushNotifications()
  const pushActionable = push.state === 'default' || push.state === 'needs-install'

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <SheetGroup label="Notifications">
        <button
          type="button"
          className={`mos-btn${push.state === 'enabled' ? ' mos-btn--on' : ''}`}
          disabled={!pushActionable}
          onClick={() => {
            if (push.state === 'default') void push.enable()
          }}
        >
          {PUSH_LABELS[push.state]}
        </button>
        <p className="mos-sheet__note">{PUSH_HINTS[push.state]}</p>
      </SheetGroup>

      <SheetGroup label="Text capture">
        <button
          type="button"
          className="mos-btn"
          disabled={textCaptureChecking}
          onClick={onCheckTexts}
        >
          {textCaptureChecking ? 'Checking…' : 'Check for new texts'}
        </button>
        <p className="mos-sheet__note">
          {textCaptureConnected
            ? 'Connected. New texts are pulled in automatically every couple of minutes.'
            : 'Texts arrive through the webhook; inbox polling runs when Twilio is configured.'}
        </p>
      </SheetGroup>

      <SheetGroup label="Today">
        <label className="mos-toggle">
          <input
            type="checkbox"
            checked={sortTodayByTime}
            onChange={(event) => onSortTodayByTimeChange(event.target.checked)}
          />
          <span>Sort Today by time</span>
        </label>
        <p className="mos-sheet__note">
          Off keeps the order you arranged by hand.
        </p>
      </SheetGroup>

      <SheetGroup label="How it works">
        <ul className="mos-sheet__list">
          <li>Every task lives once, in a context list.</li>
          <li>Today, Tomorrow and This Week hold references, never copies.</li>
          <li>Completed tasks clear themselves after an hour.</li>
          <li>Tomorrow rolls into Today each morning.</li>
        </ul>
      </SheetGroup>
    </Sheet>
  )
}
