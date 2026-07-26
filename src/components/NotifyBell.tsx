import { usePushNotifications } from '../hooks/usePushNotifications'
import type { PushUiState } from '../lib/webPushClient'

function labelFor(state: PushUiState): string {
  switch (state) {
    case 'enabled':
      return 'Notifications on'
    case 'denied':
      return 'Notifications blocked'
    case 'needs-install':
      return 'Install app for alerts'
    case 'unsupported':
      return 'Notifications unavailable'
    case 'busy':
      return 'Notifications…'
    default:
      return 'Enable notifications'
  }
}

function titleFor(state: PushUiState): string {
  switch (state) {
    case 'enabled':
      return 'Web push enabled — you will get a phone alert when a text is captured'
    case 'denied':
      return 'Notifications are blocked. Enable them in system Settings for this app.'
    case 'needs-install':
      return 'On iPhone, Add to Home Screen first, then open Lana OS from the icon to enable notifications.'
    case 'unsupported':
      return 'This browser does not support web push.'
    case 'busy':
      return 'Working…'
    default:
      return 'Enable phone notifications when a to-do is captured from a text'
  }
}

export function NotifyBell() {
  const { state, enable } = usePushNotifications()
  const canEnable = state === 'default'
  const disabled = state === 'enabled' || state === 'denied' || state === 'unsupported' || state === 'busy'

  const onClick = () => {
    if (state === 'needs-install') {
      window.alert(
        'On iPhone: Share → Add to Home Screen, then open Lana OS from the home-screen icon and tap Enable notifications.',
      )
      return
    }
    if (!canEnable) return
    void enable()
  }

  return (
    <button
      type="button"
      className={`topbar__btn topbar__notify${state === 'enabled' ? ' topbar__notify--on' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={titleFor(state)}
      aria-label={labelFor(state)}
      data-state={state}
    >
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
        <path
          d="M10 2.5a4.2 4.2 0 0 0-4.2 4.2v2.1c0 .7-.28 1.37-.78 1.87L4.2 11.5h11.6l-.82-.83a2.65 2.65 0 0 1-.78-1.87V6.7A4.2 4.2 0 0 0 10 2.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 14.2a1.8 1.8 0 0 0 3.6 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span>{labelFor(state)}</span>
    </button>
  )
}
