import { defaultBoardColumns } from './board'
import { localDateKey } from './storage'
import type { AppState, Task } from './types'
import { DEFAULT_LISTS, LISTS_VERSION } from './types'

/**
 * Seed a lively first-run board. Pure data helper — does not touch classifier/timing/rollover.
 */
export function createDemoState(now = Date.now()): AppState {
  const t = (partial: Partial<Task> & Pick<Task, 'id' | 'text' | 'listId'>): Task => ({
    completed: false,
    completedAt: null,
    createdAt: now - 60_000,
    time: null,
    overdue: false,
    isNew: false,
    ...partial,
  })

  const tasks: Record<string, Task> = {
    d1: t({
      id: 'd1',
      text: 'Film newsletter intro',
      listId: 'content-todo',
      time: '09:30',
    }),
    d2: t({
      id: 'd2',
      text: 'Reply to Maya about shoot dates',
      listId: 'follow-ups',
      time: '11:00',
    }),
    d3: t({
      id: 'd3',
      text: 'Pick up dry cleaning',
      listId: 'errands',
      overdue: true,
    }),
    d4: t({
      id: 'd4',
      text: 'Morning stretch + walk',
      listId: 'personal',
      time: '07:45',
    }),
    d5: t({
      id: 'd5',
      text: 'Draft script for product walkthrough',
      listId: 'content-todo',
    }),
    d6: t({
      id: 'd6',
      text: 'Follow up with the studio about Friday',
      listId: 'follow-ups',
    }),
    d7: t({
      id: 'd7',
      text: 'Buy oat milk and lemons',
      listId: 'errands',
    }),
    d8: t({
      id: 'd8',
      text: 'Read https://paulgraham.com/makersschedule.html',
      listId: 'reading',
    }),
    d9: t({
      id: 'd9',
      text: 'Content idea: Thursday post angles',
      listId: 'content-ideas',
    }),
    d10: t({
      id: 'd10',
      text: 'Something unsorted I captured mid-walk',
      listId: 'random',
    }),
    d11: t({
      id: 'd11',
      text: 'Book dentist checkup',
      listId: 'appointments',
    }),
    d12: t({
      id: 'd12',
      text: 'Ship thumbnail variants',
      listId: 'content-todo',
      completed: true,
      completedAt: now - 5 * 60_000,
    }),
  }

  const lists = DEFAULT_LISTS.map((l) => ({ ...l, collapsed: false }))

  return {
    tasks,
    lists,
    playlists: {
      today: ['d4', 'd1', 'd2', 'd3'],
      tomorrow: ['d6', 'd7'],
      week: ['d5', 'd9', 'd11'],
    },
    lastRolloverDate: localDateKey(),
    collapsedPlaylists: { today: false, tomorrow: false, week: false },
    theme: 'dark',
    sortTodayByTime: false,
    seeded: true,
    boardColumns: defaultBoardColumns(lists.map((l) => l.id)),
    cardHeights: {},
    cardWidths: {},
    listOrders: {
      random: ['d10'],
      personal: ['d4'],
      'content-todo': ['d1', 'd5', 'd12'],
      'follow-ups': ['d2', 'd6'],
      errands: ['d3', 'd7'],
      appointments: ['d11'],
      reading: ['d8'],
      'content-ideas': ['d9'],
    },
    listsVersion: LISTS_VERSION,
  }
}
