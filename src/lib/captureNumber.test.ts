import { describe, expect, it } from 'vitest'
import { contactCardHref, formatCaptureNumber } from './captureNumber'

describe('formatCaptureNumber', () => {
  it('reads a US number back the way a person would', () => {
    expect(formatCaptureNumber('+15551234567')).toBe('+1 (555) 123-4567')
    expect(formatCaptureNumber('5551234567')).toBe('(555) 123-4567')
  })

  it('leaves anything else alone', () => {
    expect(formatCaptureNumber('+442071234567')).toBe('+442071234567')
    expect(formatCaptureNumber('  ')).toBe('')
  })
})

describe('contactCardHref', () => {
  it('builds a vCard the phone can save', () => {
    const href = contactCardHref('+15551234567')
    const card = decodeURIComponent(href.split(',')[1])
    expect(href.startsWith('data:text/vcard')).toBe(true)
    expect(card).toContain('TEL;TYPE=CELL:+15551234567')
    expect(card).toContain('FN:Lana OS')
  })
})
