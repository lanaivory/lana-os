import { describe, expect, it } from 'vitest'
import { cardNeedsExpand, findFirstSearchMatch } from './searchNav'
import type { AppState } from './types'
import { DEFAULT_LISTS, LISTS_VERSION } from './types'

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    tasks: {
      d8: {
        id: 'd8',
        text: 'Read https://paulgraham.com/makersschedule.html',
        listId: 'reading',
        completed: false,
        completedAt: null,
        createdAt: 1,
        time: null,
        overdue: false,
        isNew: false,
      },
      u1: {
        id: 'u1',
        text: 'UCLA campus visit',
        listId: 'personal',
        completed: false,
        completedAt: null,
        createdAt: 1,
        time: null,
        overdue: false,
        isNew: false,
      },
    },
    lists: DEFAULT_LISTS,
    playlists: { today: [], tomorrow: [], week: [] },
    lastRolloverDate: '2026-07-26',
    collapsedPlaylists: { today: false, tomorrow: false, week: false },
    theme: 'dark',
    sortTodayByTime: false,
    wrapTaskTitles: true,
    taskTitleWrapOverrides: {},
    seeded: true,
    boardColumns: [
      ['today', 'tomorrow', 'week'],
      ['personal'],
      ['reading'],
    ],
    cardHeights: {},
    cardWidths: {},
    listOrders: {},
    listsVersion: LISTS_VERSION,
    trash: [],
    commitments: [],
    unsureCapture: 'ask',
    unsureListId: 'random',
    ...overrides,
  }
}

describe('findFirstSearchMatch', () => {
  it('finds the first matching task in board order', () => {
    const match = findFirstSearchMatch(baseState(), 'UCLA')
    expect(match).toEqual({ taskId: 'u1', cardId: 'personal' })
  })

  it('returns null when nothing matches', () => {
    expect(findFirstSearchMatch(baseState(), 'zzzz')).toBe(null)
  })
})

describe('cardNeedsExpand', () => {
  it('reports collapsed lists', () => {
    const state = baseState({
      lists: DEFAULT_LISTS.map((l) =>
        l.id === 'personal' ? { ...l, collapsed: true } : l,
      ),
    })
    expect(cardNeedsExpand(state, 'personal')).toEqual({
      kind: 'list',
      id: 'personal',
    })
  })
})
