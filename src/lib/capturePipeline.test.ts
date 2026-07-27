import { describe, expect, it } from 'vitest'
import {
  applyCaptureToState,
  mergeMissingSmsTasks,
  stateHasSmsMessage,
} from './capturePipeline'
import { createEmptyState } from './types'

describe('applyCaptureToState', () => {
  it('splits, classifies, and honors timing words', () => {
    const base = createEmptyState()
    const { state, createdIds } = applyCaptureToState(
      base,
      'Book dentist today\nBuy milk tomorrow\nPlan launch this week',
      { fromText: true, messageSid: 'SMtest1', now: 1000 },
    )

    expect(createdIds).toEqual([
      'sms_SMtest1_0',
      'sms_SMtest1_1',
      'sms_SMtest1_2',
    ])
    expect(state.tasks['sms_SMtest1_0'].listId).toBe('appointments')
    expect(state.tasks['sms_SMtest1_1'].listId).toBe('errands')
    expect(state.playlists.today).toContain('sms_SMtest1_0')
    expect(state.playlists.tomorrow).toContain('sms_SMtest1_1')
    expect(state.playlists.week).toContain('sms_SMtest1_2')
    expect(state.tasks['sms_SMtest1_0'].isNew).toBe(true)
  })

  it('is idempotent for the same MessageSid', () => {
    const base = createEmptyState()
    const first = applyCaptureToState(base, 'Buy milk', {
      messageSid: 'SMdup',
      now: 1,
    })
    const second = applyCaptureToState(first.state, 'Buy milk', {
      messageSid: 'SMdup',
      now: 2,
    })
    expect(second.createdIds).toEqual([])
    expect(second.state).toBe(first.state)
    expect(stateHasSmsMessage(second.state, 'SMdup')).toBe(true)
  })

  it('merges webhook SMS tasks missing from a local snapshot', () => {
    const local = createEmptyState()
    const remote = applyCaptureToState(createEmptyState(), 'Buy milk tonight', {
      messageSid: 'SMremote',
      fromText: true,
      now: 9,
    }).state
    const merged = mergeMissingSmsTasks(local, remote)
    expect(merged.tasks['sms_SMremote_0'].text).toBe('Buy milk tonight')
    expect(merged.playlists.today).toContain('sms_SMremote_0')
    expect(mergeMissingSmsTasks(merged, remote)).toBe(merged)
  })
})
