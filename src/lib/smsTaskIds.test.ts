import { describe, expect, it } from 'vitest'
import { smsTaskId } from './smsTaskIds'

describe('smsTaskId', () => {
  it('builds a stable id from sid + index', () => {
    expect(smsTaskId('SMabc123', 0)).toBe('sms_SMabc123_0')
    expect(smsTaskId('SMabc123', 1)).toBe('sms_SMabc123_1')
  })

  it('strips unsafe sid characters', () => {
    expect(smsTaskId('SM/../evil id!', 0)).toBe('sms_SMevilid_0')
  })
})
