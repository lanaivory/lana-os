import { describe, expect, it, vi } from 'vitest'
import { createEmptyState } from '../src/lib/types.js'
import { ingestSmsIntoCloudState } from './smsBoard.js'

describe('ingestSmsIntoCloudState', () => {
  it('writes classified tasks with MessageSid ids and timing playlists', async () => {
    let stored = createEmptyState()
    const ingested = new Set<string>()

    const result = await ingestSmsIntoCloudState(
      'Book dentist today\nReply to Maya tomorrow',
      'SMabc',
      {
        KV_REST_API_URL: 'https://kv.example',
        KV_REST_API_TOKEN: 'tok',
      },
      {
        read: async () => stored,
        write: async (state) => {
          stored = state
          return true
        },
        isIngested: async (sid) => ingested.has(sid),
        markIngested: async (sids) => {
          for (const sid of sids) ingested.add(sid)
          return true
        },
        now: 42,
      },
    )

    expect(result.ok).toBe(true)
    expect(result.saved).toBe(true)
    expect(result.alreadyIngested).toBe(false)
    expect(result.taskIds).toEqual(['sms_SMabc_0', 'sms_SMabc_1'])
    expect(stored.tasks['sms_SMabc_0'].listId).toBe('appointments')
    expect(stored.tasks['sms_SMabc_1'].listId).toBe('follow-ups')
    expect(stored.playlists.today).toContain('sms_SMabc_0')
    expect(stored.playlists.tomorrow).toContain('sms_SMabc_1')
    expect(ingested.has('SMabc')).toBe(true)
  })

  it('skips re-ingest when MessageSid was already marked', async () => {
    const write = vi.fn(async () => true)
    const result = await ingestSmsIntoCloudState('Buy milk', 'SMold', {
      KV_REST_API_URL: 'https://kv.example',
      KV_REST_API_TOKEN: 'tok',
    }, {
      read: async () => {
        const state = createEmptyState()
        return applySeed(state, 'SMold', 'Buy milk', 'errands')
      },
      write,
      isIngested: async () => true,
      markIngested: async () => true,
    })

    expect(result.alreadyIngested).toBe(true)
    expect(result.saved).toBe(false)
    expect(write).not.toHaveBeenCalled()
    expect(result.taskIds).toEqual(['sms_SMold_0'])
  })

  it('no-ops when KV is unset', async () => {
    const result = await ingestSmsIntoCloudState('Buy milk', 'SMx', {})
    expect(result).toEqual({
      ok: false,
      taskIds: [],
      alreadyIngested: false,
      saved: false,
    })
  })
})

function applySeed(
  state: ReturnType<typeof createEmptyState>,
  sid: string,
  text: string,
  listId: string,
) {
  const id = `sms_${sid}_0`
  return {
    ...state,
    seeded: true,
    tasks: {
      ...state.tasks,
      [id]: {
        id,
        text,
        listId,
        completed: false,
        completedAt: null,
        createdAt: 1,
        time: null,
        overdue: false,
        isNew: true,
      },
    },
    listOrders: { ...state.listOrders, [listId]: [id] },
  }
}
