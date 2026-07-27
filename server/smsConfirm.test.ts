import { describe, expect, it } from 'vitest'
import {
  buildPushConfirmation,
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

describe('buildPushConfirmation', () => {
  it('puts the destination list in the notification title', () => {
    expect(buildPushConfirmation('Buy oat milk', 'SMpush1')).toEqual({
      title: 'Added to Errands',
      body: 'Buy oat milk',
      taskId: 'sms_SMpush1_0',
      listId: 'errands',
      url: '/?focus=sms_SMpush1_0',
    })
  })

  it('lists each to-do with its list when several arrive', () => {
    expect(
      buildPushConfirmation('Book dentist checkup\nReply to Maya', 'SMmulti'),
    ).toEqual({
      title: 'Added to your lists',
      body:
        '• Book dentist checkup → Appointments\n• Reply to Maya → Follow-ups',
      taskId: 'sms_SMmulti_0',
      listId: 'appointments',
      url: '/?focus=sms_SMmulti_0',
    })
  })

  it('returns null for empty body', () => {
    expect(buildPushConfirmation('   ')).toBeNull()
  })

  it('omits taskId/focus when MessageSid is missing', () => {
    expect(buildPushConfirmation('Buy oat milk')).toEqual({
      title: 'Added to Errands',
      body: 'Buy oat milk',
      listId: 'errands',
      url: '/',
    })
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
