import { describe, expect, it } from 'vitest'
import { migrateState } from './storage'
import { createEmptyState } from './types'

describe('migrateState task title wrap', () => {
  it('defaults wrapTaskTitles to false and empty overrides', () => {
    const next = migrateState({})
    expect(next.wrapTaskTitles).toBe(false)
    expect(next.taskTitleWrapOverrides).toEqual({})
  })

  it('preserves wrapTaskTitles and bool overrides', () => {
    const next = migrateState({
      ...createEmptyState(),
      wrapTaskTitles: true,
      taskTitleWrapOverrides: { a: true, b: false, bad: 'nope' as unknown as boolean },
    })
    expect(next.wrapTaskTitles).toBe(true)
    expect(next.taskTitleWrapOverrides).toEqual({ a: true, b: false })
  })
})
