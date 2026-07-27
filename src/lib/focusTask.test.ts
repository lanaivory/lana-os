import { describe, expect, it } from 'vitest'
import { cardIdForTask, readFocusTaskId } from './focusTask'
import type { AppState } from './types'
import { DEFAULT_LISTS, LISTS_VERSION } from './types'

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    tasks: {},
    lists: DEFAULT_LISTS,
    playlists: { today: [], tomorrow: [], week: [] },
    lastRolloverDate: '2026-07-26',
    collapsedPlaylists: { today: false, tomorrow: false, week: false },
    theme: 'dark',
    sortTodayByTime: false,
    wrapTaskTitles: true,
    taskTitleWrapOverrides: {},
    seeded: true,
    boardColumns: [['today', 'tomorrow', 'week']],
    cardHeights: {},
    cardWidths: {},
    listOrders: {},
    listsVersion: LISTS_VERSION,
    trash: [],
    ...overrides,
  }
}

describe('readFocusTaskId', () => {
  it('reads focus from a query string', () => {
    expect(readFocusTaskId('?focus=sms_SM1_0')).toBe('sms_SM1_0')
    expect(readFocusTaskId('?q=1')).toBe(null)
  })
})

describe('cardIdForTask', () => {
  it('prefers playlist membership over the context list', () => {
    const state = baseState({
      tasks: {
        t1: {
          id: 't1',
          text: 'Dentist',
          listId: 'appointments',
          completed: false,
          completedAt: null,
          createdAt: 1,
          time: null,
          overdue: false,
          isNew: false,
        },
      },
      playlists: { today: ['t1'], tomorrow: [], week: [] },
    })
    expect(cardIdForTask(state, 't1')).toBe('today')
  })

  it('falls back to the context list', () => {
    const state = baseState({
      tasks: {
        t1: {
          id: 't1',
          text: 'Dentist',
          listId: 'appointments',
          completed: false,
          completedAt: null,
          createdAt: 1,
          time: null,
          overdue: false,
          isNew: false,
        },
      },
    })
    expect(cardIdForTask(state, 't1')).toBe('appointments')
  })
})
