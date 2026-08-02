import { describe, expect, it } from 'vitest'
import { canMoveInOrder, moveInOrder } from './reorder'

describe('moveInOrder', () => {
  it('swaps adjacent rows when nothing is hidden', () => {
    const order = ['a', 'b', 'c']
    expect(moveInOrder(order, order, 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveInOrder(order, order, 'b', 1)).toEqual(['a', 'c', 'b'])
  })

  it('skips over hidden entries in the stored order', () => {
    const full = ['a', 'hidden', 'b']
    const visible = ['a', 'b']
    expect(moveInOrder(full, visible, 'b', -1)).toEqual(['b', 'hidden', 'a'])
  })

  it('is a no-op at the ends', () => {
    const order = ['a', 'b']
    expect(moveInOrder(order, order, 'a', -1)).toBe(order)
    expect(moveInOrder(order, order, 'b', 1)).toBe(order)
    expect(canMoveInOrder(order, 'a', -1)).toBe(false)
    expect(canMoveInOrder(order, 'a', 1)).toBe(true)
  })

  it('is a no-op for ids missing from either sequence', () => {
    const full = ['a', 'b']
    expect(moveInOrder(full, ['a', 'b'], 'ghost', 1)).toBe(full)
    expect(moveInOrder(full, ['a', 'b', 'ghost'], 'ghost', -1)).toBe(full)
  })
})
