import { describe, expect, it } from 'vitest'
import { formatPlanTime, parseTimeMinutes } from './timeFormat'

describe('parseTimeMinutes', () => {
  it('counts minutes since midnight', () => {
    expect(parseTimeMinutes('00:00')).toBe(0)
    expect(parseTimeMinutes('09:30')).toBe(570)
    expect(parseTimeMinutes('23:59')).toBe(1439)
  })

  it('returns null for empty or malformed values', () => {
    expect(parseTimeMinutes(null)).toBeNull()
    expect(parseTimeMinutes('half nine')).toBeNull()
    expect(parseTimeMinutes('24:00')).toBeNull()
    expect(parseTimeMinutes('10:75')).toBeNull()
  })
})

describe('formatPlanTime', () => {
  it('drops the minutes on the hour', () => {
    expect(formatPlanTime('07:00')).toBe('7am')
    expect(formatPlanTime('19:00')).toBe('7pm')
  })

  it('keeps the minutes otherwise', () => {
    expect(formatPlanTime('07:45')).toBe('7:45am')
    expect(formatPlanTime('13:05')).toBe('1:05pm')
  })

  it('handles both ends of the clock', () => {
    expect(formatPlanTime('00:30')).toBe('12:30am')
    expect(formatPlanTime('12:00')).toBe('12pm')
  })

  it('returns null for empty or malformed values', () => {
    expect(formatPlanTime(null)).toBeNull()
    expect(formatPlanTime('')).toBeNull()
    expect(formatPlanTime('nope')).toBeNull()
    expect(formatPlanTime('25:00')).toBeNull()
    expect(formatPlanTime('10:75')).toBeNull()
  })
})
