import { describe, expect, it } from 'vitest'
import {
  buildSmsConfirmation,
  buildTwimlMessage,
  classifyInboundTodos,
  escapeXml,
  extractTwilioBody,
} from './smsConfirm.js'

describe('classifyInboundTodos', () => {
  it('uses the shared splitter and classifier', () => {
    const todos = classifyInboundTodos(
      'Book dentist checkup\nBuy milk\nEmail Alex',
    )
    expect(todos.map((t) => t.listName)).toEqual([
      'Appointments',
      'Errands',
      'Follow-up',
    ])
  })
})

describe('buildSmsConfirmation', () => {
  it('formats a single to-do on one line', () => {
    expect(buildSmsConfirmation('Buy oat milk')).toBe(
      'Got it ✅ Buy oat milk → Errands',
    )
  })

  it('formats multiple to-dos with a header and bullets', () => {
    expect(
      buildSmsConfirmation('Book dentist checkup\nReply to Maya'),
    ).toBe(
      'Got it ✅\n• Book dentist checkup → Appointments\n• Reply to Maya → Follow-up',
    )
  })

  it('handles empty body', () => {
    expect(buildSmsConfirmation('   ')).toBe('Got it ✅')
  })
})

describe('buildTwimlMessage', () => {
  it('returns valid TwiML and escapes XML', () => {
    const xml = buildTwimlMessage('Got it ✅ A & B <C>')
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Response><Message>Got it ✅ A &amp; B &lt;C&gt;</Message></Response>',
    )
    expect(escapeXml(`"'`)).toBe('&quot;&apos;')
  })
})

describe('extractTwilioBody', () => {
  it('reads Body from objects and urlencoded strings', () => {
    expect(extractTwilioBody({ Body: '  Hello  ' })).toBe('Hello')
    expect(extractTwilioBody('Body=Buy+milk&From=%2B1555')).toBe('Buy milk')
    expect(extractTwilioBody({})).toBe('')
  })
})
