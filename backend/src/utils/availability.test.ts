import { describe, expect, it } from 'vitest'
import { addMinutes, taipeiTime, toTime } from './availability'

describe('toTime', () => {
  it('分鐘轉成 HH:mm', () => {
    expect(toTime(0)).toBe('00:00')
    expect(toTime(570)).toBe('09:30')
    expect(toTime(1260)).toBe('21:00')
  })
})

describe('addMinutes', () => {
  it('加上服務時間', () => {
    expect(addMinutes('10:00', 90)).toBe('11:30')
    expect(addMinutes('10:30:00', 30)).toBe('11:00')
  })
})

describe('taipeiTime', () => {
  it('以台北時間（+08:00）解讀', () => {
    expect(taipeiTime('2026-10-24', '10:00').toISOString()).toBe('2026-10-24T02:00:00.000Z')
  })

  it('接受含秒數的時間', () => {
    expect(taipeiTime('2026-10-24', '10:00:00').toISOString()).toBe('2026-10-24T02:00:00.000Z')
  })
})
