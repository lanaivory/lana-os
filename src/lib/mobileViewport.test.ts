import { describe, expect, it, vi } from 'vitest'
import { isMobileNativeViewport, MOBILE_NATIVE_MQ } from './mobileViewport'

describe('mobileViewport', () => {
  it('exports the 768px media query', () => {
    expect(MOBILE_NATIVE_MQ).toBe('(max-width: 768px)')
  })

  it('is true when the media query matches', () => {
    const win = {
      matchMedia: vi.fn(() => ({ matches: true })),
    }
    expect(isMobileNativeViewport(win as unknown as Window)).toBe(true)
    expect(win.matchMedia).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('is false when the media query does not match', () => {
    const win = {
      matchMedia: vi.fn(() => ({ matches: false })),
    }
    expect(isMobileNativeViewport(win as unknown as Window)).toBe(false)
  })

  it('is false without matchMedia', () => {
    expect(isMobileNativeViewport(undefined)).toBe(false)
  })
})
