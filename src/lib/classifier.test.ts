import { describe, expect, it } from 'vitest'
import { classifyTask } from './classifier'

describe('classifyTask', () => {
  it('routes URLs to Reading', () => {
    expect(classifyTask('Check https://example.com/article').listId).toBe(
      'reading',
    )
    expect(classifyTask('www.example.com/notes').listId).toBe('reading')
  })

  it('routes appointment phrasing to Appointments', () => {
    expect(classifyTask('Book dentist checkup').listId).toBe('appointments')
    expect(classifyTask('Schedule an appointment with Dr. Lee').listId).toBe(
      'appointments',
    )
    expect(classifyTask('Make a reservation for Friday').listId).toBe(
      'appointments',
    )
    expect(classifyTask('Haircut at 3').listId).toBe('appointments')
    expect(classifyTask('Meeting with Jordan tomorrow').listId).toBe(
      'appointments',
    )
    expect(classifyTask('Set up a vet appt').listId).toBe('appointments')
  })

  it('routes follow-up language', () => {
    expect(classifyTask('Email Alex about the proposal').listId).toBe(
      'follow-up',
    )
    expect(classifyTask('Text Sam when you land').listId).toBe('follow-up')
    expect(classifyTask('Call the studio to confirm').listId).toBe('follow-up')
    expect(classifyTask('Reach out to Maya').listId).toBe('follow-up')
    expect(classifyTask('Ping Chris about the deck').listId).toBe('follow-up')
  })

  it('routes errands', () => {
    expect(classifyTask('Buy milk and pick up dry cleaning').listId).toBe(
      'errands',
    )
    expect(classifyTask('Grab oat milk').listId).toBe('errands')
    expect(classifyTask('Order paper towels').listId).toBe('errands')
    expect(classifyTask('Drop off the package').listId).toBe('errands')
  })

  it('routes content work', () => {
    expect(classifyTask('Draft the blog post outline').listId).toBe('content')
    expect(classifyTask('Edit the reel and write a caption').listId).toBe(
      'content',
    )
    expect(classifyTask('Film thumbnail variants').listId).toBe('content')
  })

  it('routes personal (not medical appointments)', () => {
    expect(classifyTask('Morning workout and meditation').listId).toBe(
      'personal',
    )
    expect(classifyTask('Self care evening').listId).toBe('personal')
  })

  it('falls back to Inbox when unsure', () => {
    expect(classifyTask('Figure out the widget thing').listId).toBe('inbox')
  })
})
