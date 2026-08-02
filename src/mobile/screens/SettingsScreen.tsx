import { usePushNotifications } from '../../hooks/usePushNotifications'
import type { PushUiState } from '../../lib/webPushClient'
import type { ThemeMode } from '../../lib/types'
import { Group, Row } from '../components/Group'

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

/**
 * Owns the push hook so the permission/subscription lookup only runs while
 * the Settings tab is on screen, not on every app load.
 */
function NotificationsRow() {
  const { state, enable } = usePushNotifications()

  return (
    <Group label="Notifications" hint={PUSH_HINTS[state]}>
      <button
        type="button"
        className={`mos-btn${state === 'enabled' ? ' mos-btn--on' : ''}`}
        disabled={state !== 'default'}
        onClick={() => void enable()}
      >
        {PUSH_LABELS[state]}
      </button>
    </Group>
  )
}

type Props = {
  theme: ThemeMode
  sortTodayByTime: boolean
  completedCount: number
  trashCount: number
  textCaptureConnected: boolean
  textCaptureChecking: boolean
  onToggleTheme: () => void
  onSortTodayByTimeChange: (value: boolean) => void
  onNewList: () => void
  onReorderLists: () => void
  onClearCompleted: () => void
  onOpenTrash: () => void
  onCheckTexts: () => void
}

export function SettingsScreen({
  theme,
  sortTodayByTime,
  completedCount,
  trashCount,
  textCaptureConnected,
  textCaptureChecking,
  onToggleTheme,
  onSortTodayByTimeChange,
  onNewList,
  onReorderLists,
  onClearCompleted,
  onOpenTrash,
  onCheckTexts,
}: Props) {
  return (
    <div className="mos-scroll">
      <Group label="Planning" hint="Off keeps the order you arranged by hand.">
        <label className="mos-toggle">
          <input
            type="checkbox"
            checked={sortTodayByTime}
            onChange={(event) => onSortTodayByTimeChange(event.target.checked)}
          />
          <span>Sort Today by time</span>
        </label>
      </Group>

      <Group label="Lists">
        <Row label="New list" onClick={onNewList} />
        <Row
          label="Reorder lists"
          hint="Opens the Lists tab in reorder mode"
          onClick={onReorderLists}
        />
        <Row
          label="Clear completed"
          hint={
            completedCount === 0
              ? 'Nothing completed'
              : `${completedCount} task${completedCount === 1 ? '' : 's'}`
          }
          disabled={completedCount === 0}
          onClick={onClearCompleted}
        />
        <Row
          label="Recently deleted"
          hint={
            trashCount === 0
              ? 'Empty'
              : `${trashCount} item${trashCount === 1 ? '' : 's'}, kept 24 hours`
          }
          onClick={onOpenTrash}
        />
      </Group>

      <NotificationsRow />

      <Group
        label="Text capture"
        hint={
          textCaptureConnected
            ? 'Connected. New texts are pulled in automatically every couple of minutes.'
            : 'Texts arrive through the webhook; inbox polling runs when Twilio is configured.'
        }
      >
        <button
          type="button"
          className="mos-btn"
          disabled={textCaptureChecking}
          onClick={onCheckTexts}
        >
          {textCaptureChecking ? 'Checking…' : 'Check for new texts'}
        </button>
      </Group>

      <Group label="Appearance">
        <button type="button" className="mos-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        </button>
      </Group>

      <Group label="How it works">
        <ul className="mos-bullets">
          <li>Every task lives once, in a context list.</li>
          <li>Today, Tomorrow and This Week hold references, never copies.</li>
          <li>Completed tasks clear themselves after an hour.</li>
          <li>Tomorrow rolls into Today each morning.</li>
        </ul>
      </Group>
    </div>
  )
}
