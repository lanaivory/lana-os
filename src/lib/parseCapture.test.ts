import { describe, expect, it } from 'vitest'
import { splitCaptureText } from './parseCapture'

describe('splitCaptureText', () => {
  it('splits lines and bullets', () => {
    const raw = `- Buy milk
* Call Sam
1. Read article`
    expect(splitCaptureText(raw)).toEqual([
      'Buy milk',
      'Call Sam',
      'Read article',
    ])
  })

  it('splits action chains', () => {
    expect(
      splitCaptureText('Draft the outline then send it to Maya'),
    ).toEqual(['Draft the outline', 'send it to Maya'])
  })

  it('keeps URLs intact', () => {
    expect(splitCaptureText('https://example.com/a then notes')).toEqual([
      'https://example.com/a then notes',
    ])
  })
})
