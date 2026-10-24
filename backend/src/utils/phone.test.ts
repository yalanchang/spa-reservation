import { describe, expect, it } from 'vitest'
import { isValidTaiwanPhone, normalizeTaiwanPhone } from './phone'

describe('normalizeTaiwanPhone', () => {
  it('去掉空白、-、括號', () => {
    expect(normalizeTaiwanPhone('0912-345 678')).toBe('0912345678')
    expect(normalizeTaiwanPhone('(02) 2345-6789')).toBe('0223456789')
  })

  it('+886 轉成 0', () => {
    expect(normalizeTaiwanPhone('+886 912 345 678')).toBe('0912345678')
  })
})

describe('isValidTaiwanPhone', () => {
  it('手機 09 開頭 10 碼', () => {
    expect(isValidTaiwanPhone('0912345678')).toBe(true)
    expect(isValidTaiwanPhone('+886912345678')).toBe(true)
    expect(isValidTaiwanPhone('091234567')).toBe(false)
  })

  it('市話 02–08 區碼', () => {
    expect(isValidTaiwanPhone('02-2345-6789')).toBe(true)
    expect(isValidTaiwanPhone('07-1234567')).toBe(true)
  })

  it('不合法格式', () => {
    expect(isValidTaiwanPhone('')).toBe(false)
    expect(isValidTaiwanPhone('0112345678')).toBe(false)
    expect(isValidTaiwanPhone('abc')).toBe(false)
  })
})
