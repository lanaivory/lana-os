import { describe, expect, it } from 'vitest'
import { NEW_TASK_TTL_MS, taskShowsNew } from './taskNew'

describe('taskShowsNew', () => {
  it('is false when isNew is false', () => {
    expect(taskShowsNew({ isNew: false, createdAt: Date.now() })).toBe(false)
  })

  it('is true within the 2-hour window', () => {
    const now = 1_000_000
    expect(
      taskShowsNew({ isNew: true, createdAt: now - 30 * 60 * 1000 }, now),
    ).toBe(true)
  })

  it('expires after 2 hours', () => {
    const now = 1_000_000
    expect(
      taskShowsNew(
        { isNew: true, createdAt: now - NEW_TASK_TTL_MS - 1 },
        now,
      ),
    ).toBe(false)
  })
})
