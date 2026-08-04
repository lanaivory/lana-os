import { useMemo } from 'react'
import { daysUntil, upcomingCommitments, weekCommitments } from '../../lib/commitments'
import type { FeedEvent } from '../../lib/ics'
import type { AgendaView } from '../../lib/mobilePrefs'
import type { AppState, Commitment } from '../../lib/types'
import { CommitmentRow } from '../components/CommitmentRow'
import { TimeBox } from '../components/TimeBox'
import { PlusIcon } from '../components/icons'

export type FeedStatus = 'off' | 'loading' | 'ok' | 'error'

type Props = {
  state: AppState
  todayKey: string
  view: AgendaView
  feedEvents: FeedEvent[]
  feedStatus: FeedStatus
  onViewChange: (view: AgendaView) => void
  onToggleCommitment: (id: string) => void
  onOpenCommitment: (id: string) => void
  onAddCommitment: () => void
  onConnectCalendar: () => void
}

type DayGroup = {
  dateKey: string
  label: string
  commitments: Commitment[]
  events: FeedEvent[]
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

function labelFor(dateKey: string, todayKey: string): string {
  const diff = daysUntil(dateKey, todayKey)
  const [year, month, day] = dateKey.split('-').map(Number)
  const formatted = DATE_FORMAT.format(new Date(year, month - 1, day))
  if (diff === 0) return `Today · ${formatted}`
  if (diff === 1) return `Tomorrow · ${formatted}`
  if (diff !== null && diff < 0) return `Overdue · ${formatted}`
  return formatted
}

function groupByDate(
  commitments: Commitment[],
  events: FeedEvent[],
  todayKey: string,
): DayGroup[] {
  const byDate = new Map<string, DayGroup>()
  const bucket = (dateKey: string): DayGroup => {
    const existing = byDate.get(dateKey)
    if (existing) return existing
    const group: DayGroup = {
      dateKey,
      label: labelFor(dateKey, todayKey),
      commitments: [],
      events: [],
    }
    byDate.set(dateKey, group)
    return group
  }

  for (const commitment of commitments) bucket(commitment.date).commitments.push(commitment)
  for (const event of events) bucket(event.date).events.push(event)

  return [...byDate.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

/**
 * The agenda of things with a date. Commitments walk themselves forward as the
 * day nears, so this is a list to read rather than a grid to manage — there is
 * no hour timeline here, because a task's time belongs on its row.
 */
export function CalendarScreen({
  state,
  todayKey,
  view,
  feedEvents,
  feedStatus,
  onViewChange,
  onToggleCommitment,
  onOpenCommitment,
  onAddCommitment,
  onConnectCalendar,
}: Props) {
  const groups = useMemo(() => {
    const commitments =
      view === 'week'
        ? weekCommitments(state, todayKey)
        : upcomingCommitments(state, todayKey)
    const events = feedEvents.filter((event) => {
      const diff = daysUntil(event.date, todayKey) ?? 0
      return view === 'week' ? diff >= 0 && diff <= 7 : diff > 7
    })
    return groupByDate(commitments, events, todayKey)
  }, [state, todayKey, view, feedEvents])

  return (
    <div className="mos-scroll">
      <div className="mos-segments" role="tablist" aria-label="Agenda range">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'week'}
          className={`mos-segment${view === 'week' ? ' is-active' : ''}`}
          onClick={() => onViewChange('week')}
        >
          Week
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'upcoming'}
          className={`mos-segment${view === 'upcoming' ? ' is-active' : ''}`}
          onClick={() => onViewChange('upcoming')}
        >
          Upcoming
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="mos-empty">
          {view === 'week'
            ? 'Nothing committed this week.'
            : 'Nothing further out yet.'}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.dateKey} className="mos-agenda__day">
            <h2 className="mos-agenda__label">{group.label}</h2>
            <ul className="mos-tasks">
              {group.commitments.map((commitment) => (
                <CommitmentRow
                  key={commitment.id}
                  commitment={commitment}
                  lists={state.lists}
                  todayKey={todayKey}
                  showDate={false}
                  onToggle={onToggleCommitment}
                  onOpen={onOpenCommitment}
                />
              ))}
              {group.events.map((event) => (
                <li key={`${event.uid}-${event.date}`} className="mos-task is-readonly">
                  <div className="mos-task__slide">
                    {/* Nothing to check, but the column still has to line up. */}
                    <span className="mos-task__gutter" aria-hidden />
                    <TimeBox time={event.time} hold />
                    <span className="mos-task__body">
                      <span className="mos-task__title">{event.title}</span>
                      <span className="mos-task__trailing">
                        <span className="mos-task__day">Calendar</span>
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <button type="button" className="mos-ghost-btn" onClick={onAddCommitment}>
        <PlusIcon />
        New commitment
      </button>

      {feedStatus === 'off' && (
        <button type="button" className="mos-linkish" onClick={onConnectCalendar}>
          Connect Google Calendar (optional)
        </button>
      )}
      {feedStatus === 'error' && (
        <p className="mos-note">
          That calendar feed could not be read. Check the address in Settings.
        </p>
      )}
      {feedStatus === 'ok' && (
        <p className="mos-note">Google Calendar events are shown read-only.</p>
      )}
    </div>
  )
}
