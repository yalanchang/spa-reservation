import { describe, expect, it } from 'vitest'
import { isValidCarrier, isValidTaxId } from './invoice'

describe('isValidCarrier', () => {
  it('「/」加 7 碼', () => {
    expect(isValidCarrier('/ABC1234')).toBe(true)
    expect(isValidCarrier('/A.B+C-1')).toBe(true)
  })

  it('不合法格式', () => {
    expect(isValidCarrier('ABC1234')).toBe(false)
    expect(isValidCarrier('/abc1234')).toBe(false)
    expect(isValidCarrier('/ABC123')).toBe(false)
  })
})

describe('isValidTaxId', () => {
  it('真實公司統編', () => {
    expect(isValidTaxId('22099131')).toBe(true) // 台積電
    expect(isValidTaxId('04541302')).toBe(true) // 鴻海
    expect(isValidTaxId('96979933')).toBe(true) // 中華電信
  })

  it('第 7 碼是 7 的特殊規則', () => {
    expect(isValidTaxId('10458575')).toBe(true)
  })

  it('不合法統編', () => {
    expect(isValidTaxId('12345678')).toBe(false)
    expect(isValidTaxId('1234567')).toBe(false)
    expect(isValidTaxId('2209913A')).toBe(false)
  })
})
