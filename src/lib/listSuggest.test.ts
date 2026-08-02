import { describe, expect, it } from 'vitest'
import { recentlyUsedListIds, suggestLists } from './listSuggest'
import { createEmptyState, type ContextList, type Task } from './types'

const lists: ContextList[] = [
  { id: 'errands', name: 'Errands', collapsed: false, color: '#a' },
  { id: 'personal', name: 'Personal', collapsed: false, color: '#b' },
  { id: 'reading', name: 'Reading', collapsed: false, color: '#c' },
  { id: 'random', name: 'Random', collapsed: false, color: '#d' },
]

describe('suggestLists', () => {
  it('leads with what the classifier recognises', () => {
    expect(suggestLists('buy stamps', { lists })[0]).toBe('errands')
  })

  it('preselects the current list on an edit but still suggests', () => {
    const picks = suggestLists('buy stamps', {
      lists,
      currentListId: 'personal',
    })
    expect(picks[0]).toBe('personal')
    expect(picks).toContain('errands')
  })

  it('pads with recent lists when the text says nothing', () => {
    expect(
      suggestLists('mmm', { lists, recentListIds: ['reading'], limit: 2 }),
    ).toEqual(['reading', 'errands'])
  })

  it('never repeats a list or exceeds the limit', () => {
    const picks = suggestLists('buy a book https://example.com', {
      lists,
      currentListId: 'errands',
      recentListIds: ['errands', 'reading'],
      limit: 3,
    })
    expect(picks).toHaveLength(3)
    expect(new Set(picks).size).toBe(3)
  })

  it('ignores lists that no longer exist', () => {
    expect(suggestLists('buy stamps', { lists, currentListId: 'gone' })).not.toContain(
      'gone',
    )
  })
})

describe('recentlyUsedListIds', () => {
  it('returns distinct lists newest first', () => {
    const state = createEmptyState()
    const task = (id: string, listId: string, createdAt: number): Task => ({
      id,
      text: id,
      listId,
      completed: false,
      completedAt: null,
      createdAt,
      time: null,
      overdue: false,
      isNew: false,
    })
    state.tasks = {
      a: task('a', 'errands', 3),
      b: task('b', 'personal', 2),
      c: task('c', 'errands', 1),
    }
    expect(recentlyUsedListIds(state)).toEqual(['errands', 'personal'])
  })
})
