import { describe, expect, it } from 'vitest'
import {
  insertCardOnBoard,
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
    ...partial,
  }
}

describe('board layout helpers', () => {
  it('inserts a card into a new column', () => {
    const cols = [['today'], ['inbox']]
    expect(insertCardOnBoard(cols, 'inbox', { newColumnAt: 0 })).toEqual([
      ['inbox'],
      ['today'],
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
      a: task({ id: 'a', text: 'A', listId: 'content' }),
      b: task({ id: 'b', text: 'B', listId: 'content' }),
    }
    state.listOrders = { content: ['a', 'b'] }
    state.playlists.today = ['a']
    expect(plannedTaskIds(state).has('a')).toBe(true)
    expect(orderedListTasks(state, 'content', { hidePlanned: true })).toEqual([
      'b',
    ])
    expect(orderedListTasks(state, 'content')).toEqual(['a', 'b'])
  })
})
