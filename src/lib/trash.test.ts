import { describe, expect, it } from 'vitest'
import { migrateState } from './storage'
import {
  formatTrashTimeRemaining,
  msUntilTrashPurge,
  permanentlyDeleteTrashEntry,
  purgeExpiredTrash,
  restoreTrashEntry,
  softDeleteList,
  softDeleteTask,
  TRASH_TTL_MS,
} from './trash'
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

describe('trash soft-delete', () => {
  it('soft-deletes a task and preserves playlist memberships for restore', () => {
    const state = createEmptyState()
    state.tasks = {
      t1: task({ id: 't1', text: 'Plan shoot', listId: 'personal' }),
    }
    state.listOrders = { personal: ['t1'] }
    state.playlists.today = ['t1']
    state.playlists.week = ['t1']

    const deleted = softDeleteTask(state, 't1', 1000)
    expect(deleted.tasks.t1).toBeUndefined()
    expect(deleted.playlists.today).toEqual([])
    expect(deleted.playlists.week).toEqual([])
    expect(deleted.listOrders.personal).toEqual([])
    expect(deleted.trash).toHaveLength(1)
    expect(deleted.trash[0]).toMatchObject({
      kind: 'task',
      deletedAt: 1000,
      playlists: ['today', 'week'],
      listOrderIndex: 0,
    })

    const restored = restoreTrashEntry(deleted, deleted.trash[0])
    expect(restored.tasks.t1?.text).toBe('Plan shoot')
    expect(restored.tasks.t1?.listId).toBe('personal')
    expect(restored.playlists.today).toEqual(['t1'])
    expect(restored.playlists.week).toEqual(['t1'])
    expect(restored.listOrders.personal).toEqual(['t1'])
    expect(restored.trash).toEqual([])
  })

  it('soft-deletes a list with its tasks and restores board position', () => {
    const state = createEmptyState()
    state.tasks = {
      a: task({ id: 'a', text: 'A', listId: 'errands' }),
      b: task({ id: 'b', text: 'B', listId: 'errands' }),
      c: task({ id: 'c', text: 'C', listId: 'personal' }),
    }
    state.listOrders = { errands: ['a', 'b'], personal: ['c'] }
    state.playlists.tomorrow = ['a']
    state.boardColumns = [
      ['today', 'tomorrow', 'week'],
      ['personal', 'errands', 'reading'],
    ]

    const deleted = softDeleteList(state, 'errands', 2000)
    expect(deleted.lists.some((l) => l.id === 'errands')).toBe(false)
    expect(deleted.tasks.a).toBeUndefined()
    expect(deleted.tasks.b).toBeUndefined()
    expect(deleted.tasks.c).toBeDefined()
    expect(deleted.playlists.tomorrow).toEqual([])
    expect(deleted.boardColumns.flat()).not.toContain('errands')
    expect(deleted.trash).toHaveLength(1)
    expect(deleted.trash[0].kind).toBe('list')
    if (deleted.trash[0].kind !== 'list') throw new Error('expected list')
    expect(deleted.trash[0].tasks.map((t) => t.task.id)).toEqual(['a', 'b'])

    const restored = restoreTrashEntry(deleted, deleted.trash[0])
    expect(restored.lists.some((l) => l.id === 'errands')).toBe(true)
    expect(restored.tasks.a?.listId).toBe('errands')
    expect(restored.tasks.b?.listId).toBe('errands')
    expect(restored.listOrders.errands).toEqual(['a', 'b'])
    expect(restored.playlists.tomorrow).toEqual(['a'])
    expect(restored.boardColumns[1]).toEqual(['personal', 'errands', 'reading'])
    expect(restored.trash).toEqual([])
  })

  it('permanently deletes a trash entry immediately', () => {
    let state = createEmptyState()
    state.tasks = { t1: task({ id: 't1', text: 'Gone', listId: 'random' }) }
    state = softDeleteTask(state, 't1', 1)
    const entry = state.trash[0]
    const next = permanentlyDeleteTrashEntry(state, entry)
    expect(next.trash).toEqual([])
    expect(next.tasks.t1).toBeUndefined()
  })

  it('auto-purges trash entries after 24 hours', () => {
    const now = 10_000_000
    let state = createEmptyState()
    state.tasks = {
      keep: task({ id: 'keep', text: 'Keep', listId: 'random' }),
      gone: task({ id: 'gone', text: 'Gone', listId: 'random' }),
    }
    state = softDeleteTask(state, 'gone', now - TRASH_TTL_MS - 1)
    state = softDeleteTask(state, 'keep', now - 1000)

    const next = purgeExpiredTrash(state, now)
    expect(next.trash).toHaveLength(1)
    expect(next.trash[0].kind).toBe('task')
    if (next.trash[0].kind !== 'task') throw new Error('expected task')
    expect(next.trash[0].task.id).toBe('keep')
  })

  it('formats remaining time and ms until purge', () => {
    const now = 1_000_000
    const entry = {
      kind: 'task' as const,
      deletedAt: now - (TRASH_TTL_MS - 90 * 60_000),
      task: task({ id: 't', text: 'X', listId: 'random' }),
      playlists: [],
      listOrderIndex: 0,
    }
    expect(msUntilTrashPurge(entry, now)).toBe(90 * 60_000)
    expect(formatTrashTimeRemaining(entry, now)).toBe('1h 30m left')
  })
})

describe('trash + migrateState', () => {
  it('keeps soft-deleted seed lists out of the board until restored', () => {
    const state = createEmptyState()
    const deleted = softDeleteList(state, 'personal', Date.now())
    const migrated = migrateState(deleted)
    expect(migrated.lists.some((l) => l.id === 'personal')).toBe(false)
    expect(migrated.trash.some((e) => e.kind === 'list' && e.list.id === 'personal')).toBe(
      true,
    )
  })
})
