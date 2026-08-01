import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isListSortMode,
  loadListSortMode,
  saveListSortMode,
  sortTasksForListMode,
} from './listSort'
import type { Task } from './types'

const KEY = 'lana-os:list-sort-mode'

function stubLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  })
}

function task(partial: Partial<Task> & Pick<Task, 'id' | 'text'>): Task {
  return {
    listId: 'random',
    completed: false,
    completedAt: null,
    createdAt: 0,
    time: null,
    overdue: false,
    isNew: false,
    ...partial,
  }
}

beforeEach(() => {
  stubLocalStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listSort', () => {
  it('defaults to custom and persists modes', () => {
    expect(loadListSortMode()).toBe('custom')
    saveListSortMode('az')
    expect(loadListSortMode()).toBe('az')
    expect(localStorage.getItem(KEY)).toBe('az')
  })

  it('guards unknown values', () => {
    expect(isListSortMode('custom')).toBe(true)
    expect(isListSortMode('nope')).toBe(false)
    localStorage.setItem(KEY, 'nope')
    expect(loadListSortMode()).toBe('custom')
  })

  it('sorts A–Z by title', () => {
    const tasks = [
      task({ id: '1', text: 'zebra', createdAt: 1 }),
      task({ id: '2', text: 'Apple', createdAt: 2 }),
      task({ id: '3', text: 'mango', createdAt: 3 }),
    ]
    expect(sortTasksForListMode(tasks, 'az').map((t) => t.id)).toEqual([
      '2',
      '3',
      '1',
    ])
  })

  it('sorts recently added newest-first with completed last', () => {
    const tasks = [
      task({ id: 'old', text: 'a', createdAt: 1 }),
      task({ id: 'new', text: 'b', createdAt: 9 }),
      task({ id: 'done', text: 'c', createdAt: 99, completed: true }),
    ]
    expect(sortTasksForListMode(tasks, 'recent').map((t) => t.id)).toEqual([
      'new',
      'old',
      'done',
    ])
  })

  it('leaves custom order untouched', () => {
    const tasks = [
      task({ id: '1', text: 'z', createdAt: 1 }),
      task({ id: '2', text: 'a', createdAt: 2 }),
    ]
    expect(sortTasksForListMode(tasks, 'custom')).toBe(tasks)
  })
})
