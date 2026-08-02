import { describe, expect, it, vi } from 'vitest'
import { runDueReminders } from './reminders.js'
import {
  createEmptyState,
  type AppState,
  type Commitment,
} from '../src/lib/types.js'

const KV_ENV = {
  KV_REST_API_URL: 'https://kv.example',
  KV_REST_API_TOKEN: 'token',
} as NodeJS.ProcessEnv

const NOW = 1_700_000_000_000

function commitment(partial: Partial<Commitment> & Pick<Commitment, 'id'>): Commitment {
  return {
    title: partial.id,
    date: '2026-08-02',
    time: '09:00',
    reminderMinutesBefore: 0,
    reminderAt: NOW - 1000,
    reminderSentAt: null,
    listId: null,
    done: false,
    createdAt: 0,
    ...partial,
  }
}

function stateWith(commitments: Commitment[]): AppState {
  return { ...createEmptyState(), commitments }
}

describe('runDueReminders', () => {
  it('does nothing without KV', async () => {
    const read = vi.fn()
    expect(await runDueReminders({}, { read, now: NOW })).toEqual({
      sent: 0,
      due: 0,
      saved: false,
    })
    expect(read).not.toHaveBeenCalled()
  })

  it('pushes each due reminder and marks it sent', async () => {
    const state = stateWith([
      commitment({ id: 'a', title: 'Dentist' }),
      commitment({ id: 'b', reminderAt: NOW + 60_000 }),
    ])
    const send = vi.fn(async (_body: string) => ({
      sent: 1,
      failed: 0,
      pruned: 0,
    }))
    const write = vi.fn(async (_state: AppState) => true)

    const result = await runDueReminders(KV_ENV, {
      read: async () => state,
      write,
      send,
      now: NOW,
    })

    expect(result).toEqual({ sent: 1, due: 1, saved: true })
    expect(send.mock.calls[0][0]).toContain('Dentist')
    const saved = write.mock.calls[0][0]
    expect(saved.commitments[0].reminderSentAt).toBe(NOW)
    expect(saved.commitments[1].reminderSentAt).toBeNull()
  })

  it('sends nothing on a second run', async () => {
    let state = stateWith([commitment({ id: 'a' })])
    const send = vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 }))
    const deps = {
      read: async () => state,
      write: async (next: AppState) => {
        state = next
        return true
      },
      send,
      now: NOW,
    }

    await runDueReminders(KV_ENV, deps)
    const second = await runDueReminders(KV_ENV, deps)

    expect(send).toHaveBeenCalledTimes(1)
    expect(second).toEqual({ sent: 0, due: 0, saved: false })
  })

  it('still marks a reminder whose push failed, rather than retrying forever', async () => {
    const write = vi.fn(async (_state: AppState) => true)
    const result = await runDueReminders(KV_ENV, {
      read: async () => stateWith([commitment({ id: 'a' })]),
      write,
      send: async () => {
        throw new Error('push down')
      },
      now: NOW,
    })

    expect(result).toEqual({ sent: 0, due: 1, saved: true })
    expect(write.mock.calls[0][0].commitments[0].reminderSentAt).toBe(NOW)
  })
})
