import { describe, expect, it } from 'vitest'
import { formatMinutesUntil, nowCard, shuffleCandidates } from './nowCard'
import { createEmptyState, type AppState, type Task } from './types'

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    text: partial.id,
    listId: 'random',
    completed: false,
    completedAt: null,
    createdAt: 0,
    time: null,
    overdue: false,
    isNew: false,
    ...partial,
  }
}

function stateWith(tasks: Task[], today: string[], listOrders = {}): AppState {
  const base = createEmptyState()
  return {
    ...base,
    tasks: Object.fromEntries(tasks.map((t) => [t.id, t])),
    playlists: { ...base.playlists, today },
    listOrders,
  }
}

const at = (hour: number, minute = 0) => new Date(2026, 7, 2, hour, minute)

describe('nowCard', () => {
  it('commits to a timed task once it is inside the lead window', () => {
    const state = stateWith(
      [task({ id: 'a', time: '10:00' }), task({ id: 'b' })],
      ['a', 'b'],
    )
    const card = nowCard(state, {
      now: at(9, 45),
      leadMinutes: 30,
      shuffleSource: 'today',
    })
    expect(card).toMatchObject({ kind: 'timed', minutesUntil: 15 })
  })

  it('suggests instead while the timed task is still far off', () => {
    const state = stateWith(
      [task({ id: 'a', time: '17:00' }), task({ id: 'b' })],
      ['a', 'b'],
    )
    const card = nowCard(state, {
      now: at(9, 0),
      leadMinutes: 30,
      shuffleSource: 'today',
    })
    expect(card).toMatchObject({ kind: 'suggestion' })
    expect(card?.task.id).toBe('b')
  })

  it('keeps holding a task that is running late', () => {
    const state = stateWith([task({ id: 'a', time: '09:00' })], ['a'])
    const card = nowCard(state, {
      now: at(9, 40),
      leadMinutes: 15,
      shuffleSource: 'today',
    })
    expect(card).toMatchObject({ kind: 'timed', minutesUntil: -40 })
  })

  it('gives up on a task that is hours late', () => {
    const state = stateWith(
      [task({ id: 'a', time: '01:00' }), task({ id: 'b' })],
      ['a', 'b'],
    )
    expect(
      nowCard(state, { now: at(9, 0), leadMinutes: 15, shuffleSource: 'today' }),
    ).toMatchObject({ kind: 'suggestion', task: { id: 'b' } })
  })

  it('skips completed and timed tasks when shuffling', () => {
    const state = stateWith(
      [
        task({ id: 'a', completed: true }),
        task({ id: 'b', time: '10:00' }),
        task({ id: 'c' }),
      ],
      ['a', 'b', 'c'],
    )
    expect(shuffleCandidates(state, 'today').map((t) => t.id)).toEqual(['c'])
  })

  it('re-rolls through the candidates and wraps around', () => {
    const state = stateWith([task({ id: 'a' }), task({ id: 'b' })], ['a', 'b'])
    const pick = (shuffleIndex: number) =>
      nowCard(state, {
        now: at(9),
        leadMinutes: 30,
        shuffleSource: 'today',
        shuffleIndex,
      })?.task.id
    expect(pick(0)).toBe('a')
    expect(pick(1)).toBe('b')
    expect(pick(2)).toBe('a')
  })

  it('can shuffle across every list, not just Today', () => {
    const state = stateWith(
      [task({ id: 'a', listId: 'random' }), task({ id: 'z', listId: 'random' })],
      ['a'],
      { random: ['a', 'z'] },
    )
    expect(shuffleCandidates(state, 'today').map((t) => t.id)).toEqual(['a'])
    expect(shuffleCandidates(state, 'all').map((t) => t.id)).toEqual(['a', 'z'])
  })

  it('shows nothing when there is nothing to do', () => {
    expect(
      nowCard(stateWith([], []), {
        now: at(9),
        leadMinutes: 30,
        shuffleSource: 'today',
      }),
    ).toBeNull()
  })
})

describe('formatMinutesUntil', () => {
  it('reads like a person would say it', () => {
    expect(formatMinutesUntil(-20)).toBe('20 min late')
    expect(formatMinutesUntil(0)).toBe('Now')
    expect(formatMinutesUntil(12)).toBe('in 12 min')
  })
})
