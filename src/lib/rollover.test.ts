import { describe, expect, it } from 'vitest'
import { applyMorningRollover } from './rollover'
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

describe('applyMorningRollover', () => {
  it('stamps first launch without moving playlists', () => {
    const state = createEmptyState()
    const next = applyMorningRollover(state, new Date('2026-07-18T09:00:00'))
    expect(next.lastRolloverDate).toBe('2026-07-18')
    expect(next.playlists.tomorrow).toEqual([])
  })

  it('moves Tomorrow into Today and marks unfinished as overdue', () => {
    const state = createEmptyState()
    state.lastRolloverDate = '2026-07-17'
    state.tasks = {
      a: task({ id: 'a', text: 'Old today' }),
      b: task({ id: 'b', text: 'From tomorrow' }),
      c: task({ id: 'c', text: 'Done', completed: true, completedAt: 1 }),
    }
    state.playlists.today = ['a', 'c']
    state.playlists.tomorrow = ['b']

    const next = applyMorningRollover(state, new Date('2026-07-18T08:00:00'))
    expect(next.playlists.tomorrow).toEqual([])
    expect(next.playlists.today).toEqual(['a', 'b'])
    expect(next.tasks.a.overdue).toBe(true)
    expect(next.tasks.b.overdue).toBe(false)
    expect(next.lastRolloverDate).toBe('2026-07-18')
  })

  it('is idempotent within the same day', () => {
    const state = createEmptyState()
    state.lastRolloverDate = '2026-07-18'
    state.playlists.tomorrow = ['x']
    const next = applyMorningRollover(state, new Date('2026-07-18T20:00:00'))
    expect(next).toBe(state)
  })
})
