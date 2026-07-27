import { afterEach, describe, expect, it } from 'vitest'
import { loadBoardZoomOut, saveBoardZoomOut } from './boardZoom'

const KEY = 'lana-os:board-zoom-out'

afterEach(() => {
  localStorage.removeItem(KEY)
})

describe('boardZoom', () => {
  it('defaults to zoomed in', () => {
    expect(loadBoardZoomOut()).toBe(false)
  })

  it('persists zoom-out across load', () => {
    saveBoardZoomOut(true)
    expect(loadBoardZoomOut()).toBe(true)
    saveBoardZoomOut(false)
    expect(loadBoardZoomOut()).toBe(false)
  })
})
