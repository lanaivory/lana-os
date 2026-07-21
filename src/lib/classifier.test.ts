import { describe, expect, it } from 'vitest'
import { classifyTask } from './classifier'

describe('classifyTask', () => {
  it('routes URLs to Reading', () => {
    expect(classifyTask('Check https://example.com/article').listId).toBe(
      'reading',
    )
    expect(classifyTask('www.example.com/notes').listId).toBe('reading')
  })

  it('routes linkedin to LinkedIn to-do', () => {
    expect(classifyTask('Rewrite LinkedIn about section').listId).toBe(
      'linkedin-todo',
    )
  })

  it('routes instagram / ig / reel / story to Instagram to-do', () => {
    expect(classifyTask('Post this on Instagram').listId).toBe(
      'instagram-todo',
    )
    expect(classifyTask('Draft an IG caption').listId).toBe('instagram-todo')
    expect(classifyTask('Edit the reel').listId).toBe('instagram-todo')
    expect(classifyTask('Story idea for Friday').listId).toBe('instagram-todo')
  })

  it('routes appointment phrasing to Appointments', () => {
    expect(classifyTask('Book dentist checkup').listId).toBe('appointments')
    expect(classifyTask('Schedule an appointment with Dr. Lee').listId).toBe(
      'appointments',
    )
    expect(classifyTask('Set up a vet appt').listId).toBe('appointments')
    expect(classifyTask('Doctor visit next week').listId).toBe('appointments')
    expect(classifyTask('Confirm apt for Tuesday').listId).toBe('appointments')
  })

  it('routes follow-up language', () => {
    expect(classifyTask('Follow up with Alex about the proposal').listId).toBe(
      'follow-ups',
    )
    expect(classifyTask('Email back Sam when you land').listId).toBe(
      'follow-ups',
    )
    expect(classifyTask('Reply to Maya').listId).toBe('follow-ups')
    expect(classifyTask('Circle back on the deck').listId).toBe('follow-ups')
    expect(classifyTask('Check in with Chris').listId).toBe('follow-ups')
  })

  it('routes ideas to Content ideas', () => {
    expect(classifyTask('Idea for a carousel').listId).toBe('content-ideas')
    expect(classifyTask('Brainstorm newsletter topics').listId).toBe(
      'content-ideas',
    )
  })

  it('routes errands and travel bookings to Errands', () => {
    expect(classifyTask('Buy milk and pick up dry cleaning').listId).toBe(
      'errands',
    )
    expect(classifyTask('Order paper towels').listId).toBe('errands')
    expect(classifyTask('Return the package').listId).toBe('errands')
    expect(classifyTask('Book a flight to SF').listId).toBe('errands')
    expect(classifyTask('Buy train ticket').listId).toBe('errands')
    expect(classifyTask('Reserve hotel for the trip').listId).toBe('errands')
    expect(classifyTask('Amtrak to Philly').listId).toBe('errands')
    expect(classifyTask('Make a reservation for Friday').listId).toBe('errands')
  })

  it('routes later / someday / eventually to Later', () => {
    expect(classifyTask('Organize the basement later').listId).toBe('later')
    expect(classifyTask('Someday learn Italian').listId).toBe('later')
    expect(classifyTask('Eventually rewrite the wiki').listId).toBe('later')
  })

  it('routes lovable to Lovable', () => {
    expect(classifyTask('Ship the Lovable prototype').listId).toBe('lovable')
  })

  it('routes content verbs to Content to-do', () => {
    expect(classifyTask('Draft the blog post outline').listId).toBe(
      'content-todo',
    )
    expect(classifyTask('Film thumbnail variants').listId).toBe('content-todo')
    expect(classifyTask('Edit the script tonight').listId).toBe('content-todo')
    expect(classifyTask('Record voiceover').listId).toBe('content-todo')
  })

  it('routes personal keywords to Personal', () => {
    expect(classifyTask('Morning gym and meditation').listId).toBe('personal')
    expect(classifyTask('Grocery run after work').listId).toBe('personal')
    expect(classifyTask('Call mom').listId).toBe('personal')
    expect(classifyTask('Text dad about dinner').listId).toBe('personal')
  })

  it('does not auto-route C2C, LinkedIn list, or Meta keywords alone', () => {
    // No dedicated keywords for these manual lists — unmatched → Random
    expect(classifyTask('C2C partnership notes').listId).toBe('random')
    expect(classifyTask('Meta ads budget').listId).toBe('random')
  })

  it('falls back to Random when unsure', () => {
    expect(classifyTask('Figure out the widget thing').listId).toBe('random')
  })
})
