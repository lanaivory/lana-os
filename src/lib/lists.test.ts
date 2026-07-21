import { describe, expect, it } from 'vitest'
import { ensureBuiltinLists, migrateCanonicalLists } from './lists'
import {
  createEmptyState,
  DEFAULT_LISTS,
  LISTS_VERSION,
  type AppState,
  type Task,
} from './types'

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

describe('ensureBuiltinLists', () => {
  it('adds missing seed lists in order and keeps custom lists after', () => {
    const next = ensureBuiltinLists([
      { id: 'personal', name: 'Personal', collapsed: true, color: '#111' },
      { id: 'custom', name: 'Custom', collapsed: false, color: '#222' },
    ])
    expect(next.map((l) => l.id)).toEqual([
      ...DEFAULT_LISTS.map((l) => l.id),
      'custom',
    ])
    expect(next.find((l) => l.id === 'personal')?.collapsed).toBe(true)
  })
})

describe('migrateCanonicalLists', () => {
  it('forces exactly the seed lists and remaps orphans to Random', () => {
    const state: AppState = {
      ...createEmptyState(),
      listsVersion: 0,
      lists: [
        { id: 'inbox', name: 'Inbox', collapsed: false, color: '#8b919a' },
        { id: 'content', name: 'Content', collapsed: true, color: '#d4a574' },
        { id: 'follow-up', name: 'Follow-up', collapsed: false, color: '#8fa8c8' },
        { id: 'personal', name: 'Personal', collapsed: true, color: '#7eb8a2' },
        { id: 'custom-old', name: 'Old custom', collapsed: false, color: '#000' },
      ],
      tasks: {
        a: task({ id: 'a', text: 'Inbox thing', listId: 'inbox' }),
        b: task({ id: 'b', text: 'Content thing', listId: 'content' }),
        c: task({ id: 'c', text: 'Follow', listId: 'follow-up' }),
        d: task({ id: 'd', text: 'Personal', listId: 'personal' }),
        e: task({ id: 'e', text: 'Custom', listId: 'custom-old' }),
      },
      listOrders: {
        inbox: ['a'],
        content: ['b'],
        'follow-up': ['c'],
        personal: ['d'],
        'custom-old': ['e'],
      },
      boardColumns: [['today', 'tomorrow', 'week'], ['inbox', 'content']],
    }

    const next = migrateCanonicalLists(state)

    expect(next.listsVersion).toBe(LISTS_VERSION)
    expect(next.lists.map((l) => l.id)).toEqual(DEFAULT_LISTS.map((l) => l.id))
    expect(next.lists.map((l) => l.name)).toEqual(
      DEFAULT_LISTS.map((l) => l.name),
    )
    expect(next.tasks.a.listId).toBe('random')
    expect(next.tasks.b.listId).toBe('content-todo')
    expect(next.tasks.c.listId).toBe('follow-ups')
    expect(next.tasks.d.listId).toBe('personal')
    expect(next.tasks.e.listId).toBe('random')
    expect(next.lists.find((l) => l.id === 'personal')?.collapsed).toBe(true)
    expect(next.listOrders.random).toEqual(expect.arrayContaining(['a', 'e']))
    expect(next.listOrders['content-todo']).toContain('b')
    expect(next.listOrders['follow-ups']).toContain('c')
    // Left-to-right seed order on the board (chunked by 3 after playlists).
    expect(next.boardColumns[0]).toEqual(['today', 'tomorrow', 'week'])
    expect(next.boardColumns[1]).toEqual([
      'linkedin-todo',
      'instagram-todo',
      'content-todo',
    ])
    expect(next.boardColumns[2]).toEqual(['c2c-todo', 'linkedin', 'personal'])
  })

  it('is a no-op for already-migrated state aside from ensuring builtins', () => {
    const state = createEmptyState()
    state.listsVersion = LISTS_VERSION
    const next = migrateCanonicalLists(state)
    expect(next.listsVersion).toBe(LISTS_VERSION)
    expect(next.lists.map((l) => l.id)).toEqual(DEFAULT_LISTS.map((l) => l.id))
  })
})
