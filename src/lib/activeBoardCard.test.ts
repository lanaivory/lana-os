import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadActiveBoardCardId,
  resolveActiveBoardCardId,
  saveActiveBoardCardId,
} from './activeBoardCard'

const KEY = 'lana-os:active-board-card'

function stubLocalStorage() {
  const store = new Map<string, string>()
  const api = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
  vi.stubGlobal('localStorage', api)
  return api
}

beforeEach(() => {
  stubLocalStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('activeBoardCard', () => {
  it('returns null when nothing saved', () => {
    expect(loadActiveBoardCardId()).toBeNull()
  })

  it('persists and loads an active card id', () => {
    saveActiveBoardCardId('today')
    expect(loadActiveBoardCardId()).toBe('today')
    expect(localStorage.getItem(KEY)).toBe('today')
  })

  it('resolve prefers a still-valid saved id', () => {
    expect(
      resolveActiveBoardCardId(['today', 'tomorrow', 'inbox'], 'tomorrow'),
    ).toBe('tomorrow')
  })

  it('resolve falls back to the first card when preferred is gone', () => {
    expect(
      resolveActiveBoardCardId(['today', 'tomorrow'], 'deleted-list'),
    ).toBe('today')
  })

  it('resolve returns null for an empty board', () => {
    expect(resolveActiveBoardCardId([], 'today')).toBeNull()
  })
})
