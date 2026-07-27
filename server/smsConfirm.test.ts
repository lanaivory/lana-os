import { describe, expect, it } from 'vitest'
import {
  buildSmsConfirmation,
  buildTwimlMessage,
  classifyInboundTodos,
  escapeXml,
  extractTwilioBody,
  extractTwilioMessageSid,
} from './smsConfirm.js'

describe('classifyInboundTodos', () => {
  it('uses the shared splitter and classifier', () => {
    const todos = classifyInboundTodos(
      'Book dentist checkup\nBuy milk\nReply to Alex',
    )
    expect(todos.map((t) => t.listName)).toEqual([
      'Appointments',
      'Errands',
      'Follow-ups',
    ])
  })

  it('attaches deterministic task ids when MessageSid is provided', () => {
    const todos = classifyInboundTodos('Buy milk', 'SMabc123')
    expect(todos).toHaveLength(1)
    expect(todos[0].taskId).toBe('sms_SMabc123_0')
    expect(todos[0].listId).toBe('errands')
  })

  it('routes timing words onto playlists', () => {
    const todos = classifyInboundTodos(
      'Book dentist today\nShip tomorrow\nPlan this week',
    )
    expect(todos.map((t) => t.playlistId)).toEqual([
      'today',
      'tomorrow',
      'week',
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
      'Got it ✅\n• Book dentist checkup → Appointments\n• Reply to Maya → Follow-ups',
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

describe('extractTwilioMessageSid', () => {
  it('reads MessageSid from objects and urlencoded strings', () => {
    expect(extractTwilioMessageSid({ MessageSid: '  SMabc  ' })).toBe('SMabc')
    expect(
      extractTwilioMessageSid('Body=Hi&MessageSid=SMxyz&From=%2B1555'),
    ).toBe('SMxyz')
    expect(extractTwilioMessageSid({})).toBe('')
  })
})
