import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MOBILE_PREFS,
  isListCollapsed,
  loadMobilePrefs,
  normalizeMobilePrefs,
  saveMobilePrefs,
  withListCollapsed,
} from './mobilePrefs'

function stubLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  })
  return store
}

let store: Map<string, string>

beforeEach(() => {
  store = stubLocalStorage()
})

describe('mobile prefs', () => {
  it('defaults when nothing is stored', () => {
    expect(loadMobilePrefs()).toEqual(DEFAULT_MOBILE_PREFS)
  })

  it('round-trips through localStorage', () => {
    saveMobilePrefs({
      agendaDay: 'week',
      listSort: 'az',
      listCollapse: { errands: true },
    })
    expect(loadMobilePrefs()).toEqual({
      agendaDay: 'week',
      listSort: 'az',
      listCollapse: { errands: true },
    })
  })

  it('adopts the legacy standalone sort key on first load', () => {
    store.set('lana-os:list-sort-mode', 'recent')
    expect(loadMobilePrefs().listSort).toBe('recent')
  })

  it('drops unknown values instead of throwing', () => {
    expect(
      normalizeMobilePrefs({
        agendaDay: 'someday',
        listSort: 'nonsense',
        listCollapse: { errands: true, reading: 'yes', '': true },
      }),
    ).toEqual({
      agendaDay: 'today',
      listSort: 'custom',
      listCollapse: { errands: true },
    })
  })

  it('survives corrupt JSON', () => {
    store.set('lana-os:mobile:v1', '{not json')
    expect(loadMobilePrefs()).toEqual(DEFAULT_MOBILE_PREFS)
  })

  it('folds empty lists by default and open ones not at all', () => {
    expect(
      isListCollapsed(DEFAULT_MOBILE_PREFS, 'reading', { isEmpty: true }),
    ).toBe(true)
    expect(
      isListCollapsed(DEFAULT_MOBILE_PREFS, 'reading', { isEmpty: false }),
    ).toBe(false)
  })

  it('lets an explicit choice win over the empty-list default', () => {
    const opened = withListCollapsed(DEFAULT_MOBILE_PREFS, 'reading', false)
    expect(isListCollapsed(opened, 'reading', { isEmpty: true })).toBe(false)

    const closed = withListCollapsed(DEFAULT_MOBILE_PREFS, 'reading', true)
    expect(isListCollapsed(closed, 'reading', { isEmpty: false })).toBe(true)
  })

  it('returns the same object when the choice is unchanged', () => {
    const prefs = withListCollapsed(DEFAULT_MOBILE_PREFS, 'reading', true)
    expect(withListCollapsed(prefs, 'reading', true)).toBe(prefs)
  })
})
