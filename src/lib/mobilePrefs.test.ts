import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MOBILE_PREFS,
  loadMobilePrefs,
  normalizeMobilePrefs,
  saveMobilePrefs,
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
    const prefs = {
      tab: 'calendar',
      playlistDay: 'week',
      calendarDay: 'tomorrow',
      listSort: 'az',
    } as const
    saveMobilePrefs(prefs)
    expect(loadMobilePrefs()).toEqual(prefs)
  })

  it('adopts the legacy standalone sort key on first load', () => {
    store.set('lana-os:list-sort-mode', 'recent')
    expect(loadMobilePrefs().listSort).toBe('recent')
  })

  it('carries the pre-tabs agenda day over to the playlist tab', () => {
    store.set(
      'lana-os:mobile:v1',
      JSON.stringify({ agendaDay: 'tomorrow', listSort: 'az' }),
    )
    expect(loadMobilePrefs()).toEqual({
      tab: 'playlist',
      playlistDay: 'tomorrow',
      calendarDay: 'today',
      listSort: 'az',
    })
  })

  it('drops unknown values instead of throwing', () => {
    expect(
      normalizeMobilePrefs({
        tab: 'inbox',
        playlistDay: 'someday',
        calendarDay: 7,
        listSort: 'nonsense',
      }),
    ).toEqual(DEFAULT_MOBILE_PREFS)
  })

  it('survives corrupt JSON', () => {
    store.set('lana-os:mobile:v1', '{not json')
    expect(loadMobilePrefs()).toEqual(DEFAULT_MOBILE_PREFS)
  })
})
