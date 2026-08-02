import { describe, expect, it } from 'vitest'
import {
  agendaOpenCount,
  agendaTasks,
  listOverviews,
  listSection,
  listSections,
  mobileListOrder,
  searchTasks,
  taskLocation,
} from './mobileSelectors'
import { createEmptyState, type AppState, type Task } from './types'

function task(
  partial: Partial<Task> & Pick<Task, 'id' | 'text' | 'listId'>,
): Task {
  return {
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

describe('agendaTasks', () => {
  it('keeps playlist order and skips ids with no task', () => {
    const state = stateWith([
      task({ id: 'a', text: 'A', listId: 'errands' }),
      task({ id: 'b', text: 'B', listId: 'errands' }),
    ])
    state.playlists.today = ['b', 'ghost', 'a']
    expect(agendaTasks(state, 'today').map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('sorts Today by time when the setting is on, untimed last', () => {
    const state = stateWith([
      task({ id: 'a', text: 'A', listId: 'errands', time: '14:00' }),
      task({ id: 'b', text: 'B', listId: 'errands', time: null }),
      task({ id: 'c', text: 'C', listId: 'errands', time: '09:30' }),
      task({
        id: 'd',
        text: 'D',
        listId: 'errands',
        time: '08:00',
        completed: true,
      }),
    ])
    state.playlists.today = ['a', 'b', 'c', 'd']
    state.sortTodayByTime = true
    expect(agendaTasks(state, 'today').map((t) => t.id)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ])
  })

  it('leaves other days in manual order even when sort-by-time is on', () => {
    const state = stateWith([
      task({ id: 'a', text: 'A', listId: 'errands', time: '14:00' }),
      task({ id: 'c', text: 'C', listId: 'errands', time: '09:30' }),
    ])
    state.playlists.tomorrow = ['a', 'c']
    state.sortTodayByTime = true
    expect(agendaTasks(state, 'tomorrow').map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('counts only open tasks', () => {
    const state = stateWith([
      task({ id: 'a', text: 'A', listId: 'errands' }),
      task({ id: 'b', text: 'B', listId: 'errands', completed: true }),
    ])
    state.playlists.today = ['a', 'b']
    expect(agendaOpenCount(state, 'today')).toBe(1)
    expect(agendaOpenCount(state, 'week')).toBe(0)
  })
})

describe('listSection', () => {
  it('hides planned tasks and reports the unfiltered total', () => {
    const state = stateWith([
      task({ id: 'a', text: 'Buy milk', listId: 'errands' }),
      task({ id: 'b', text: 'Buy stamps', listId: 'errands' }),
      task({ id: 'c', text: 'Call bank', listId: 'errands' }),
    ])
    state.listOrders = { errands: ['a', 'b', 'c'] }
    state.playlists.today = ['c']

    const section = listSection(state, 'errands')
    expect(section?.tasks.map((t) => t.id)).toEqual(['a', 'b'])
    expect(section?.total).toBe(2)
  })

  it('filters by query without changing the total', () => {
    const state = stateWith([
      task({ id: 'a', text: 'Buy milk', listId: 'errands' }),
      task({ id: 'b', text: 'Call bank', listId: 'errands' }),
    ])
    state.listOrders = { errands: ['a', 'b'] }

    const section = listSection(state, 'errands', { query: '  BUY ' })
    expect(section?.tasks.map((t) => t.id)).toEqual(['a'])
    expect(section?.total).toBe(2)
  })

  it('applies the sort mode', () => {
    const state = stateWith([
      task({ id: 'a', text: 'Zebra', listId: 'errands', createdAt: 1 }),
      task({ id: 'b', text: 'Apple', listId: 'errands', createdAt: 2 }),
    ])
    state.listOrders = { errands: ['a', 'b'] }

    expect(
      listSection(state, 'errands', { sort: 'az' })?.tasks.map((t) => t.id),
    ).toEqual(['b', 'a'])
    expect(
      listSection(state, 'errands', { sort: 'recent' })?.tasks.map((t) => t.id),
    ).toEqual(['b', 'a'])
    expect(
      listSection(state, 'errands', { sort: 'custom' })?.tasks.map((t) => t.id),
    ).toEqual(['a', 'b'])
  })

  it('returns null for an unknown list', () => {
    expect(listSection(createEmptyState(), 'nope')).toBeNull()
  })
})

describe('listSections', () => {
  it('follows board order and skips lists no longer present', () => {
    const state = createEmptyState()
    state.boardColumns = [
      ['today', 'tomorrow', 'week'],
      ['reading', 'deleted-list', 'errands'],
    ]
    expect(mobileListOrder(state)).toEqual(['reading', 'errands'])
    expect(listSections(state).map((s) => s.list.id)).toEqual([
      'reading',
      'errands',
    ])
  })
})

describe('listOverviews', () => {
  it('counts unplanned, open, and planned tasks per list', () => {
    const state = stateWith([
      task({ id: 'a', text: 'Buy milk', listId: 'errands' }),
      task({ id: 'b', text: 'Buy stamps', listId: 'errands', completed: true }),
      task({ id: 'c', text: 'Call bank', listId: 'errands' }),
      task({ id: 'd', text: 'Read paper', listId: 'reading' }),
    ])
    state.boardColumns = [['today'], ['errands', 'reading']]
    state.playlists.today = ['c']

    expect(
      listOverviews(state).map(({ list, total, open, planned }) => ({
        id: list.id,
        total,
        open,
        planned,
      })),
    ).toEqual([
      { id: 'errands', total: 2, open: 1, planned: 1 },
      { id: 'reading', total: 1, open: 1, planned: 0 },
    ])
  })
})

describe('searchTasks', () => {
  it('finds planned and unplanned tasks, open ones first', () => {
    const state = stateWith([
      task({ id: 'a', text: 'Buy milk', listId: 'errands', completed: true }),
      task({ id: 'b', text: 'Buy stamps', listId: 'errands' }),
      task({ id: 'c', text: 'Buy a book', listId: 'reading' }),
      task({ id: 'd', text: 'Call bank', listId: 'errands' }),
    ])
    state.boardColumns = [['today'], ['errands', 'reading']]
    state.listOrders = { errands: ['a', 'b', 'd'] }
    state.playlists.today = ['c']

    const hits = searchTasks(state, '  BUY ')
    expect(hits.map((hit) => hit.task.id)).toEqual(['b', 'c', 'a'])
    expect(hits[1].list?.id).toBe('reading')
    expect(hits[1].day).toBe('today')
    expect(hits[0].day).toBeNull()
  })

  it('still finds a task whose list was deleted', () => {
    const state = stateWith([task({ id: 'a', text: 'Orphan', listId: 'gone' })])
    const hits = searchTasks(state, 'orphan')
    expect(hits.map((hit) => hit.task.id)).toEqual(['a'])
    expect(hits[0].list).toBeNull()
  })

  it('returns nothing for a blank query', () => {
    const state = stateWith([task({ id: 'a', text: 'Buy milk', listId: 'errands' })])
    expect(searchTasks(state, '   ')).toEqual([])
  })
})

describe('taskLocation', () => {
  it('prefers the planned day over the owning list', () => {
    const state = stateWith([task({ id: 'a', text: 'A', listId: 'errands' })])
    expect(taskLocation(state, 'a')).toEqual({ kind: 'list', listId: 'errands' })

    state.playlists.week = ['a']
    expect(taskLocation(state, 'a')).toEqual({ kind: 'agenda', day: 'week' })
  })

  it('returns null for a missing task', () => {
    expect(taskLocation(createEmptyState(), 'ghost')).toBeNull()
  })
})
