import { describe, expect, it } from 'vitest'
import { isJapaneseHoliday, isNightTime, isWeekendOrHoliday } from '../app/utils/date'

describe('isNightTime', () => {
  it('returns true for overnight range after start', () => {
    const date = new Date('2026-02-21T22:30:00')
    expect(isNightTime(date, '20:00', '06:00')).toBe(true)
  })

  it('returns true for overnight range before end', () => {
    const date = new Date('2026-02-21T05:59:00')
    expect(isNightTime(date, '20:00', '06:00')).toBe(true)
  })

  it('returns false outside overnight range', () => {
    const date = new Date('2026-02-21T12:00:00')
    expect(isNightTime(date, '20:00', '06:00')).toBe(false)
  })
})

describe('isJapaneseHoliday', () => {
  it('returns true for fixed-date holidays', () => {
    expect(isJapaneseHoliday(new Date(2026, 0, 1))).toBe(true)
    expect(isJapaneseHoliday(new Date(2026, 1, 23))).toBe(true)
  })

  it('returns true for substitute holidays', () => {
    expect(isJapaneseHoliday(new Date(2026, 4, 6))).toBe(true)
  })

  it('returns true for citizens holidays', () => {
    expect(isJapaneseHoliday(new Date(2026, 8, 22))).toBe(true)
  })
})

describe('isWeekendOrHoliday', () => {
  it('returns true on weekends', () => {
    expect(isWeekendOrHoliday(new Date(2026, 1, 21))).toBe(true)
  })

  it('returns false on weekdays that are not holidays', () => {
    expect(isWeekendOrHoliday(new Date(2026, 1, 24))).toBe(false)
  })
})
