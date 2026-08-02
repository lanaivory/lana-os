import { useState, type CSSProperties } from 'react'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { contactCardHref, formatCaptureNumber } from '../../lib/captureNumber'
import {
  ACCENTS,
  NOW_LEAD_MINUTES,
  type AccentId,
  type MobilePrefs,
} from '../../lib/mobilePrefs'
import type { ShuffleSource } from '../../lib/nowCard'
import type { PushUiState } from '../../lib/webPushClient'
import type { ContextList, ThemeMode, UnsureCaptureMode } from '../../lib/types'
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
  enabled: 'Captured texts and commitment reminders reach you as phone alerts.',
  denied:
    'Notifications are blocked. Turn them back on for Lana OS in system settings.',
  'needs-install':
    'On iPhone, use Share → Add to Home Screen, then open Lana OS from the icon.',
  unsupported: 'This browser cannot receive web push notifications.',
  busy: 'Talking to the push service…',
  default: 'Get a phone alert for captured texts and commitment reminders.',
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
  captureNumber: string
  lists: ContextList[]
  unsureCapture: UnsureCaptureMode
  unsureListId: string
  prefs: MobilePrefs
  onToggleTheme: () => void
  onSortTodayByTimeChange: (value: boolean) => void
  onCaptureNumberChange: (value: string) => void
  onUnsureCaptureChange: (mode: UnsureCaptureMode, listId?: string) => void
  onAccentChange: (accent: AccentId) => void
  onNowLeadChange: (minutes: number) => void
  onShuffleSourceChange: (source: ShuffleSource) => void
  onCalendarFeedChange: (url: string) => void
  onNewList: () => void
  onReorderLists: () => void
  onClearCompleted: () => void
  onOpenTrash: () => void
  onCheckTexts: () => void
  onReplayOnboarding: () => void
}

export function SettingsScreen({
  theme,
  sortTodayByTime,
  completedCount,
  trashCount,
  textCaptureConnected,
  textCaptureChecking,
  captureNumber,
  lists,
  unsureCapture,
  unsureListId,
  prefs,
  onToggleTheme,
  onSortTodayByTimeChange,
  onCaptureNumberChange,
  onUnsureCaptureChange,
  onAccentChange,
  onNowLeadChange,
  onShuffleSourceChange,
  onCalendarFeedChange,
  onNewList,
  onReorderLists,
  onClearCompleted,
  onOpenTrash,
  onCheckTexts,
  onReplayOnboarding,
}: Props) {
  const [numberDraft, setNumberDraft] = useState(captureNumber)
  const [feedDraft, setFeedDraft] = useState(prefs.calendarFeedUrl)
  const unsureList = lists.find((list) => list.id === unsureListId)

  return (
    <div className="mos-scroll">
      <Group
        label="Capture number"
        hint="Text your to-dos here — they are split, classified, and filed for you."
      >
        {captureNumber ? (
          <a
            className="mos-btn mos-btn--accent"
            href={contactCardHref(captureNumber)}
            download="Lana OS.vcf"
          >
            {formatCaptureNumber(captureNumber)} · save as contact
          </a>
        ) : (
          <p className="mos-note">
            No inbound number configured. Add one below or set `TWILIO_NUMBER`
            on the server.
          </p>
        )}
        <label className="mos-inline-field mos-inline-field--wide">
          <input
            type="tel"
            value={numberDraft}
            placeholder="+15551234567"
            aria-label="Capture number"
            onChange={(event) => setNumberDraft(event.target.value)}
            onBlur={() => onCaptureNumberChange(numberDraft.trim())}
          />
        </label>
      </Group>

      <Group
        label="When I'm unsure"
        hint={
          unsureCapture === 'ask'
            ? 'Unplaceable captures wait in the Lists tab until you give them a home.'
            : `Unplaceable captures go straight to ${unsureList?.name ?? unsureListId}.`
        }
      >
        <div className="mos-segments">
          <button
            type="button"
            className={`mos-segment${unsureCapture === 'ask' ? ' is-active' : ''}`}
            aria-pressed={unsureCapture === 'ask'}
            onClick={() => onUnsureCaptureChange('ask')}
          >
            Ask me
          </button>
          <button
            type="button"
            className={`mos-segment${unsureCapture === 'file' ? ' is-active' : ''}`}
            aria-pressed={unsureCapture === 'file'}
            onClick={() => onUnsureCaptureChange('file')}
          >
            Auto-file
          </button>
        </div>
        {unsureCapture === 'file' && (
          <div className="mos-chiprow">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`mos-listchip${list.id === unsureListId ? ' is-active' : ''}`}
                style={{ '--tag': list.color } as CSSProperties}
                aria-pressed={list.id === unsureListId}
                onClick={() => onUnsureCaptureChange('file', list.id)}
              >
                {list.name}
              </button>
            ))}
          </div>
        )}
      </Group>

      <Group
        label="Now card"
        hint="How far ahead a timed task takes over the top of the Playlist, and where the shuffle looks."
      >
        <div className="mos-segments">
          {NOW_LEAD_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`mos-segment${prefs.nowLeadMinutes === minutes ? ' is-active' : ''}`}
              aria-pressed={prefs.nowLeadMinutes === minutes}
              onClick={() => onNowLeadChange(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <div className="mos-segments">
          <button
            type="button"
            className={`mos-segment${prefs.shuffleSource === 'today' ? ' is-active' : ''}`}
            aria-pressed={prefs.shuffleSource === 'today'}
            onClick={() => onShuffleSourceChange('today')}
          >
            Today only
          </button>
          <button
            type="button"
            className={`mos-segment${prefs.shuffleSource === 'all' ? ' is-active' : ''}`}
            aria-pressed={prefs.shuffleSource === 'all'}
            onClick={() => onShuffleSourceChange('all')}
          >
            All lists
          </button>
        </div>
      </Group>

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
        label="Google Calendar"
        hint="Optional and skippable. Paste the secret iCal address from Google Calendar settings; events appear read-only and are never changed."
      >
        <label className="mos-inline-field mos-inline-field--wide">
          <input
            type="url"
            value={feedDraft}
            placeholder="https://calendar.google.com/…/basic.ics"
            aria-label="Calendar feed address"
            onChange={(event) => setFeedDraft(event.target.value)}
            onBlur={() => onCalendarFeedChange(feedDraft.trim())}
          />
        </label>
        {prefs.calendarFeedUrl && (
          <button
            type="button"
            className="mos-btn"
            onClick={() => {
              setFeedDraft('')
              onCalendarFeedChange('')
            }}
          >
            Disconnect
          </button>
        )}
      </Group>

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
        <div className="mos-chiprow">
          {ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              className={`mos-swatch${prefs.accent === accent.id ? ' is-active' : ''}`}
              style={{ '--tag': accent.color } as CSSProperties}
              aria-pressed={prefs.accent === accent.id}
              aria-label={`${accent.name} accent`}
              onClick={() => onAccentChange(accent.id)}
            >
              <span aria-hidden />
              {accent.name}
            </button>
          ))}
        </div>
        <button type="button" className="mos-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        </button>
      </Group>

      <Group label="How it works">
        <ul className="mos-bullets">
          <li>Every task lives once, in a context list.</li>
          <li>Today, Tomorrow and This Week hold references, never copies.</li>
          <li>Commitments have a date and pull themselves forward as it nears.</li>
          <li>Completed tasks clear themselves after an hour.</li>
        </ul>
        <Row label="Show the setup steps again" onClick={onReplayOnboarding} />
      </Group>
    </div>
  )
}
