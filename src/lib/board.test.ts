import { describe, expect, it } from 'vitest'
import {
  defaultBoardColumns,
  insertCardOnBoard,
  isFlatRowBoard,
  orderedListTasks,
  plannedTaskIds,
} from './board'
import { createEmptyState, type Task } from './types'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'text' | 'listId'>): Task {
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

describe('board layout helpers', () => {
  it('defaults to stacked masonry columns', () => {
    const cols = defaultBoardColumns([
      'inbox',
      'personal',
      'content',
      'follow-up',
      'errands',
      'reading',
    ])
    expect(cols[0]).toEqual(['today', 'tomorrow', 'week'])
    expect(cols[1]).toEqual(['inbox', 'personal', 'content'])
    expect(cols[2]).toEqual(['follow-up', 'errands', 'reading'])
    expect(isFlatRowBoard(cols)).toBe(false)
  })

  it('detects legacy flat one-card-per-column boards', () => {
    expect(
      isFlatRowBoard([
        ['today', 'tomorrow', 'week'],
        ['inbox'],
        ['personal'],
        ['content'],
        ['follow-up'],
      ]),
    ).toBe(true)
  })

  it('inserts a card into a new column', () => {
    const cols = [['today'], ['inbox', 'personal']]
    expect(insertCardOnBoard(cols, 'personal', { newColumnAt: 0 })).toEqual([
      ['personal'],
      ['today'],
      ['inbox'],
    ])
  })

  it('stacks a card under another in a column', () => {
    const cols = [['today'], ['inbox'], ['personal']]
    expect(
      insertCardOnBoard(cols, 'personal', { column: 1, index: 1 }),
    ).toEqual([['today'], ['inbox', 'personal']])
  })

  it('hides planned tasks from context list ordering', () => {
    const state = createEmptyState()
    state.tasks = {
      a: task({ id: 'a', text: 'A', listId: 'content-todo' }),
      b: task({ id: 'b', text: 'B', listId: 'content-todo' }),
    }
    state.listOrders = { 'content-todo': ['a', 'b'] }
    state.playlists.today = ['a']
    expect(plannedTaskIds(state).has('a')).toBe(true)
    expect(
      orderedListTasks(state, 'content-todo', { hidePlanned: true }),
    ).toEqual(['b'])
    expect(orderedListTasks(state, 'content-todo')).toEqual(['a', 'b'])
  })
})
