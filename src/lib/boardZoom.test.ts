import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBoardZoomOut, saveBoardZoomOut } from './boardZoom'

const KEY = 'lana-os:board-zoom-out'

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

describe('boardZoom', () => {
  it('defaults to zoomed in', () => {
    expect(loadBoardZoomOut()).toBe(false)
  })

  it('persists zoom-out across load', () => {
    saveBoardZoomOut(true)
    expect(loadBoardZoomOut()).toBe(true)
    expect(localStorage.getItem(KEY)).toBe('1')
    saveBoardZoomOut(false)
    expect(loadBoardZoomOut()).toBe(false)
    expect(localStorage.getItem(KEY)).toBe('0')
  })
})
