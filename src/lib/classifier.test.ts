import { describe, expect, it } from 'vitest'
import { classifyTask } from './classifier'

describe('classifyTask', () => {
  it('routes URLs to Reading', () => {
    expect(classifyTask('Check https://example.com/article').listId).toBe(
      'reading',
    )
  })

  it('routes follow-up language', () => {
    expect(classifyTask('Email Alex about the proposal').listId).toBe(
      'follow-up',
    )
  })

  it('routes errands', () => {
    expect(classifyTask('Buy milk and pick up dry cleaning').listId).toBe(
      'errands',
    )
  })

  it('routes content work', () => {
    expect(classifyTask('Draft the blog post outline').listId).toBe('content')
  })

  it('routes personal', () => {
    expect(classifyTask('Morning workout and meditation').listId).toBe(
      'personal',
    )
  })

  it('falls back to Inbox', () => {
    expect(classifyTask('Figure out the widget thing').listId).toBe('inbox')
  })
})
