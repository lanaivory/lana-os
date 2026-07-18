import { describe, expect, it } from 'vitest'
import { routeTimingWords } from './timing'

describe('routeTimingWords', () => {
  it('maps today/tonight to Today', () => {
    expect(routeTimingWords('Ship the patch tonight').playlistId).toBe('today')
    expect(routeTimingWords('Call mom today').playlistId).toBe('today')
  })

  it('maps tomorrow to Tomorrow', () => {
    expect(routeTimingWords('Prepare slides tomorrow').playlistId).toBe(
      'tomorrow',
    )
  })

  it('maps this week to This Week', () => {
    expect(routeTimingWords('Finish taxes this week').playlistId).toBe('week')
  })

  it('returns null without timing words', () => {
    expect(routeTimingWords('Buy groceries').playlistId).toBeNull()
  })
})
