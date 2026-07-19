import { describe, expect, it } from 'vitest'
import {
  COMPLETION_CLEAR_MS,
  completeTask,
  deleteTaskFromState,
  purgeStaleCompletions,
  uncompleteTask,
} from './completion'
import { createEmptyState, type Task } from './types'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'text'>): Task {
  return {
    listId: 'inbox',
    completed: false,
    completedAt: null,
    createdAt: 1,
    time: null,
    overdue: false,
    isNew: false,
    ...partial,
  }
}

describe('completion', () => {
  it('stamps completedAt on complete and clears on uncomplete', () => {
    const t = task({ id: '1', text: 'Do it' })
    const done = completeTask(t, 1000)
    expect(done.completed).toBe(true)
    expect(done.completedAt).toBe(1000)
    expect(uncompleteTask(done).completedAt).toBeNull()
  })

  it('purges tasks after one hour and strips playlist refs', () => {
    const state = createEmptyState()
    const now = 10_000_000
    state.tasks = {
      keep: task({
        id: 'keep',
        text: 'Fresh',
        completed: true,
        completedAt: now - 1000,
      }),
      gone: task({
        id: 'gone',
        text: 'Stale',
        completed: true,
        completedAt: now - COMPLETION_CLEAR_MS - 1,
      }),
    }
    state.playlists.today = ['keep', 'gone']
    state.playlists.week = ['gone']

    const next = purgeStaleCompletions(state, now)
    expect(next.tasks.gone).toBeUndefined()
    expect(next.tasks.keep).toBeDefined()
    expect(next.playlists.today).toEqual(['keep'])
    expect(next.playlists.week).toEqual([])
  })

  it('deletes a task from every playlist', () => {
    const state = createEmptyState()
    state.tasks = { t1: task({ id: 't1', text: 'X' }) }
    state.playlists.today = ['t1']
    state.playlists.tomorrow = ['t1']
    const next = deleteTaskFromState(state, 't1')
    expect(next.tasks.t1).toBeUndefined()
    expect(next.playlists.today).toEqual([])
    expect(next.playlists.tomorrow).toEqual([])
  })
})
