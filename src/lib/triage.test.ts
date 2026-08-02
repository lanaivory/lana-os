import { describe, expect, it } from 'vitest'
import { triageCards, triageCount, tasksNeedingTriage } from './triage'
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

function stateWith(tasks: Task[]): AppState {
  return {
    ...createEmptyState(),
    tasks: Object.fromEntries(tasks.map((t) => [t.id, t])),
  }
}

describe('triage', () => {
  it('counts only unplaced, open tasks', () => {
    const state = stateWith([
      task({ id: 'a', needsTriage: true, createdAt: 1 }),
      task({ id: 'b', needsTriage: true, completed: true, createdAt: 2 }),
      task({ id: 'c', createdAt: 3 }),
    ])
    expect(triageCount(state)).toBe(1)
    expect(tasksNeedingTriage(state).map((t) => t.id)).toEqual(['a'])
  })

  it('shows newest first', () => {
    const state = stateWith([
      task({ id: 'old', needsTriage: true, createdAt: 1 }),
      task({ id: 'new', needsTriage: true, createdAt: 9 }),
    ])
    expect(tasksNeedingTriage(state).map((t) => t.id)).toEqual(['new', 'old'])
  })

  it('offers each card the raw text and some lists to choose from', () => {
    const state = stateWith([
      task({ id: 'a', text: 'mmm something', needsTriage: true }),
    ])
    const [card] = triageCards(state)
    expect(card.task.text).toBe('mmm something')
    expect(card.suggestions.length).toBe(3)
    expect(new Set(card.suggestions.map((l) => l.id)).size).toBe(3)
  })
})
