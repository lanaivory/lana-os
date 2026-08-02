import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DAY_END_HOUR,
  DEFAULT_DAY_START_HOUR,
  calendarWindow,
  dayDate,
  daySchedule,
  formatHourLabel,
  hourOfTime,
  hourTimeValue,
  nowMarker,
  parseTimeMinutes,
} from './calendar'
import { createEmptyState, type AppState, type Task } from './types'

function task(
  partial: Partial<Task> & Pick<Task, 'id' | 'text'>,
): Task {
  return {
    listId: 'errands',
    completed: false,
    completedAt: null,
    createdAt: 1,
    time: null,
    overdue: false,
    isNew: false,
    ...partial,
  }
}

function stateWith(tasks: Task[]): AppState {
  const state = createEmptyState()
  state.tasks = Object.fromEntries(tasks.map((t) => [t.id, t]))
  return state
}

describe('parseTimeMinutes', () => {
  it('reads valid HH:MM values', () => {
    expect(parseTimeMinutes('00:00')).toBe(0)
    expect(parseTimeMinutes('09:30')).toBe(570)
    expect(parseTimeMinutes('23:59')).toBe(1439)
  })

  it('rejects empty and out-of-range values', () => {
    expect(parseTimeMinutes(null)).toBeNull()
    expect(parseTimeMinutes('')).toBeNull()
    expect(parseTimeMinutes('24:00')).toBeNull()
    expect(parseTimeMinutes('9:xx')).toBeNull()
  })
})

describe('hour helpers', () => {
  it('maps a time to its hour', () => {
    expect(hourOfTime('09:30')).toBe(9)
    expect(hourOfTime('00:05')).toBe(0)
    expect(hourOfTime(null)).toBeNull()
  })

  it('formats hour values and labels', () => {
    expect(hourTimeValue(7)).toBe('07:00')
    expect(hourTimeValue(15)).toBe('15:00')
    expect(formatHourLabel(0)).toBe('12am')
    expect(formatHourLabel(7)).toBe('7am')
    expect(formatHourLabel(12)).toBe('12pm')
    expect(formatHourLabel(21)).toBe('9pm')
  })
})

describe('calendarWindow', () => {
  it('keeps the default window when nothing falls outside it', () => {
    expect(calendarWindow([task({ id: 'a', text: 'A', time: '09:00' })])).toEqual(
      { start: DEFAULT_DAY_START_HOUR, end: DEFAULT_DAY_END_HOUR },
    )
  })

  it('widens for early and late tasks', () => {
    expect(
      calendarWindow([
        task({ id: 'a', text: 'A', time: '05:15' }),
        task({ id: 'b', text: 'B', time: '23:00' }),
      ]),
    ).toEqual({ start: 5, end: 23 })
  })

  it('widens for the current hour', () => {
    expect(calendarWindow([], { nowHour: 23 })).toEqual({
      start: DEFAULT_DAY_START_HOUR,
      end: 23,
    })
  })
})

describe('daySchedule', () => {
  it('splits planned tasks into hours and an unscheduled tray', () => {
    const state = stateWith([
      task({ id: 'a', text: 'Standup', time: '09:00' }),
      task({ id: 'b', text: 'Write', time: null }),
      task({ id: 'c', text: 'Review', time: '09:45' }),
    ])
    state.playlists.today = ['a', 'b', 'c']

    const schedule = daySchedule(state, 'today')
    expect(schedule.untimed.map((t) => t.id)).toEqual(['b'])
    expect(schedule.timedCount).toBe(2)

    const nine = schedule.hours.find((slot) => slot.hour === 9)
    expect(nine?.tasks.map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('orders tasks inside an hour by minute, whatever the playlist order', () => {
    const state = stateWith([
      task({ id: 'late', text: 'Late', time: '10:50' }),
      task({ id: 'early', text: 'Early', time: '10:05' }),
    ])
    state.playlists.tomorrow = ['late', 'early']

    const ten = daySchedule(state, 'tomorrow').hours.find((s) => s.hour === 10)
    expect(ten?.tasks.map((t) => t.id)).toEqual(['early', 'late'])
  })

  it('covers every hour in the window, empty ones included', () => {
    const schedule = daySchedule(createEmptyState(), 'today')
    expect(schedule.hours[0].hour).toBe(DEFAULT_DAY_START_HOUR)
    expect(schedule.hours[schedule.hours.length - 1].hour).toBe(
      DEFAULT_DAY_END_HOUR,
    )
    expect(schedule.hours.every((slot) => slot.tasks.length === 0)).toBe(true)
  })

  it('keeps a task scheduled outside the default window', () => {
    const state = stateWith([task({ id: 'a', text: 'Red eye', time: '04:30' })])
    state.playlists.today = ['a']

    const schedule = daySchedule(state, 'today')
    expect(schedule.hours[0].hour).toBe(4)
    expect(schedule.hours[0].tasks.map((t) => t.id)).toEqual(['a'])
  })
})

describe('nowMarker', () => {
  const hours = [8, 9, 10].map((hour) => ({ hour, tasks: [] }))

  it('places the line inside the current hour', () => {
    expect(nowMarker(new Date(2026, 0, 5, 9, 15), hours)).toEqual({
      hour: 9,
      fraction: 0.25,
    })
  })

  it('is absent when the clock sits outside the window', () => {
    expect(nowMarker(new Date(2026, 0, 5, 6, 0), hours)).toBeNull()
    expect(nowMarker(new Date(2026, 0, 5, 23, 0), hours)).toBeNull()
    expect(nowMarker(new Date(2026, 0, 5, 9, 0), [])).toBeNull()
  })
})

describe('dayDate', () => {
  const now = new Date(2026, 6, 4, 22, 30)

  it('resolves today and tomorrow at midnight', () => {
    expect(dayDate('today', now)).toEqual(new Date(2026, 6, 4))
    expect(dayDate('tomorrow', now)).toEqual(new Date(2026, 6, 5))
  })

  it('has no single date for This Week', () => {
    expect(dayDate('week', now)).toBeNull()
  })
})
