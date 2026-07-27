import { describe, expect, it } from 'vitest'
import { displayTextWithoutUrl, extractUrl } from './urls'

describe('extractUrl', () => {
  it('finds http(s) urls', () => {
    expect(extractUrl('Read https://paulgraham.com/makersschedule.html')).toBe(
      'https://paulgraham.com/makersschedule.html',
    )
    expect(extractUrl('no link here')).toBe(null)
  })
})

describe('displayTextWithoutUrl', () => {
  it('strips the url and keeps the surrounding title', () => {
    expect(
      displayTextWithoutUrl('Read https://paulgraham.com/makersschedule.html'),
    ).toBe('Read')
  })

  it('returns empty when the whole text is a url', () => {
    expect(displayTextWithoutUrl('https://example.com/a')).toBe('')
  })

  it('leaves non-url text alone', () => {
    expect(displayTextWithoutUrl('Buy oat milk')).toBe('Buy oat milk')
  })
})
