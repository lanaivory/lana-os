import { describe, expect, it } from 'vitest'
import { cardLabel } from './cardLabels'
import type { AppState, ContextList } from './types'

function stubState(lists: ContextList[]): AppState {
  return { lists } as AppState
}

describe('cardLabel', () => {
  it('labels playlists', () => {
    const state = stubState([])
    expect(cardLabel(state, 'today')).toBe('Today')
    expect(cardLabel(state, 'tomorrow')).toBe('Tomorrow')
    expect(cardLabel(state, 'week')).toBe('This Week')
  })

  it('labels context lists by name', () => {
    const state = stubState([
      { id: 'l1', name: 'Errands', color: '#fff', collapsed: false },
    ])
    expect(cardLabel(state, 'l1')).toBe('Errands')
  })

  it('falls back when a list is missing', () => {
    expect(cardLabel(stubState([]), 'missing')).toBe('List')
  })
})
