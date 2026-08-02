import { describe, expect, it } from 'vitest'
import {
  ALL_DAY_REMINDER_HOUR,
  commitmentPlacement,
  commitmentTimestamp,
  commitmentsForDay,
  computeReminderAt,
  dateKeyToDate,
  daysUntil,
  dueReminders,
  formatReminder,
  sortCommitments,
  upcomingCommitments,
  weekCommitments,
  withResolvedReminder,
} from './commitments'
import { createEmptyState, type Commitment } from './types'

function commitment(partial: Partial<Commitment> & Pick<Commitment, 'id' | 'date'>): Commitment {
  return {
    title: partial.id,
    time: null,
    reminderMinutesBefore: null,
    reminderAt: null,
    reminderSentAt: null,
    listId: null,
    done: false,
    createdAt: 0,
    ...partial,
  }
}

const TODAY = '2026-08-02'

describe('date helpers', () => {
  it('reads a date key as local midnight', () => {
    const date = dateKeyToDate(TODAY)
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(7)
    expect(date?.getDate()).toBe(2)
    expect(date?.getHours()).toBe(0)
  })

  it('rejects malformed and impossible dates', () => {
    expect(dateKeyToDate('nope')).toBeNull()
    expect(dateKeyToDate('2026-02-31')).toBeNull()
    expect(dateKeyToDate('2026-13-01')).toBeNull()
  })

  it('counts whole days in both directions', () => {
    expect(daysUntil('2026-08-05', TODAY)).toBe(3)
    expect(daysUntil('2026-07-30', TODAY)).toBe(-3)
  })
})

describe('commitmentPlacement', () => {
  it('walks a commitment forward as its date nears', () => {
    expect(commitmentPlacement(commitment({ id: 'a', date: '2026-07-30' }), TODAY)).toBe('past')
    expect(commitmentPlacement(commitment({ id: 'b', date: TODAY }), TODAY)).toBe('today')
    expect(commitmentPlacement(commitment({ id: 'c', date: '2026-08-03' }), TODAY)).toBe('tomorrow')
    expect(commitmentPlacement(commitment({ id: 'd', date: '2026-08-08' }), TODAY)).toBe('week')
    expect(commitmentPlacement(commitment({ id: 'e', date: '2026-09-01' }), TODAY)).toBe('upcoming')
  })
})

describe('agenda selection', () => {
  const state = {
    ...createEmptyState(),
    commitments: [
      commitment({ id: 'late', date: '2026-07-28' }),
      commitment({ id: 'lateDone', date: '2026-07-28', done: true }),
      commitment({ id: 'now', date: TODAY, time: '14:00' }),
      commitment({ id: 'early', date: TODAY, time: '09:00' }),
      commitment({ id: 'soon', date: '2026-08-06' }),
      commitment({ id: 'far', date: '2026-10-01' }),
    ],
  }

  it('puts today and anything still overdue on Today', () => {
    expect(commitmentsForDay(state, 'today', TODAY).map((c) => c.id)).toEqual([
      'late',
      'early',
      'now',
    ])
  })

  it('pulls the next week in, and leaves the rest upcoming', () => {
    expect(weekCommitments(state, TODAY).map((c) => c.id)).toEqual([
      'late',
      'early',
      'now',
      'soon',
    ])
    expect(upcomingCommitments(state, TODAY).map((c) => c.id)).toEqual(['far'])
  })

  it('sorts by date, then time, with untimed last', () => {
    const sorted = sortCommitments([
      commitment({ id: 'b', date: TODAY, time: null }),
      commitment({ id: 'a', date: TODAY, time: '08:00' }),
      commitment({ id: 'c', date: '2026-08-01' }),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('reminders', () => {
  it('anchors an all-day commitment to the morning', () => {
    const at = commitmentTimestamp(commitment({ id: 'a', date: TODAY }))
    expect(new Date(at!).getHours()).toBe(ALL_DAY_REMINDER_HOUR)
  })

  it('subtracts the lead time from the commitment', () => {
    const target = commitment({
      id: 'a',
      date: TODAY,
      time: '14:00',
      reminderMinutesBefore: 30,
    })
    expect(computeReminderAt(target)).toBe(
      commitmentTimestamp(target)! - 30 * 60_000,
    )
  })

  it('has no moment without a reminder choice', () => {
    expect(computeReminderAt(commitment({ id: 'a', date: TODAY }))).toBeNull()
  })

  it('keeps reminderAt in step, and leaves it alone when unchanged', () => {
    const target = commitment({
      id: 'a',
      date: TODAY,
      time: '14:00',
      reminderMinutesBefore: 0,
    })
    const resolved = withResolvedReminder(target)
    expect(resolved.reminderAt).toBe(commitmentTimestamp(target))
    expect(withResolvedReminder(resolved)).toBe(resolved)
  })

  it('fires once, only for due, undone, recent reminders', () => {
    const now = 1_000_000_000
    const base = { id: 'x', date: TODAY, reminderMinutesBefore: 0 }
    const state = {
      commitments: [
        commitment({ ...base, id: 'due', reminderAt: now - 1000 }),
        commitment({ ...base, id: 'future', reminderAt: now + 60_000 }),
        commitment({ ...base, id: 'sent', reminderAt: now - 1000, reminderSentAt: now }),
        commitment({ ...base, id: 'done', reminderAt: now - 1000, done: true }),
        commitment({ ...base, id: 'ancient', reminderAt: now - 86_400_000 }),
        commitment({ id: 'noReminder', date: TODAY }),
      ],
    }
    expect(dueReminders(state, now).map((c) => c.id)).toEqual(['due'])
  })
})

describe('formatReminder', () => {
  it('names presets and falls back for custom values', () => {
    expect(formatReminder(null)).toBe('No reminder')
    expect(formatReminder(0)).toBe('At time')
    expect(formatReminder(1440)).toBe('1 day before')
    expect(formatReminder(4320)).toBe('3 days before')
    expect(formatReminder(120)).toBe('2h before')
    expect(formatReminder(45)).toBe('45m before')
  })
})
