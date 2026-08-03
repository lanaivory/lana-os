import { describe, expect, it } from 'vitest'
import { canMoveInOrder, moveInOrder, moveWithinGroup } from './reorder'

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

describe('moveWithinGroup', () => {
  it('drops a row where the one it was dragged over sits', () => {
    const full = ['a', 'b', 'c', 'd']
    expect(moveWithinGroup(full, full, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
    expect(moveWithinGroup(full, full, 'a', 'c')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('shuffles only the group, leaving other rows in their slots', () => {
    // Pinned lists are scattered through the board order they share with
    // desktop; dragging one must not pull the others out of place.
    const full = ['pin1', 'plain1', 'plain2', 'pin2', 'plain3', 'pin3']
    const pinned = ['pin1', 'pin2', 'pin3']
    expect(moveWithinGroup(full, pinned, 'pin3', 'pin1')).toEqual([
      'pin3',
      'plain1',
      'plain2',
      'pin1',
      'plain3',
      'pin2',
    ])
  })

  it('refuses a drag across groups', () => {
    const full = ['pin1', 'plain1', 'plain2']
    expect(moveWithinGroup(full, ['pin1'], 'pin1', 'plain2')).toBe(full)
    expect(moveWithinGroup(full, ['plain1', 'plain2'], 'plain1', 'pin1')).toBe(
      full,
    )
  })

  it('is a no-op when dropped on itself or on something unknown', () => {
    const full = ['a', 'b']
    expect(moveWithinGroup(full, full, 'a', 'a')).toBe(full)
    expect(moveWithinGroup(full, full, 'ghost', 'a')).toBe(full)
  })
})
