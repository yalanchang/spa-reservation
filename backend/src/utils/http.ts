import { Response } from 'express'

export const fail = (res: Response, status: number, message: string) => {
  res.status(status).json({ success: false, message })
}

export const serverError = (res: Response, label: string, error: unknown) => {
  console.error(`${label}:`, error)
  fail(res, 500, '伺服器錯誤')
}

export const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(`${value}T00:00:00`).getTime())

export const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value)

// DATE 欄位轉成 YYYY-MM-DD（用本地時間，避免時區差一天）
export const formatDate = (value: Date | string | null) => {
  if (!value) return null
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
