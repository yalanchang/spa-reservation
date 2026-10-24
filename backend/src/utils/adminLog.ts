import { Request } from 'express'
import { execute } from '../models/db'

// 後台操作紀錄；寫不進去不影響原本的操作
export const logAction = async (req: Request, action: string, target?: string, detail?: string) => {
  try {
    await execute('INSERT INTO admin_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)', [
      req.user?.userId || null,
      action,
      target?.slice(0, 100) || null,
      detail?.slice(0, 500) || null
    ])
  } catch (error) {
    console.error('Write admin log error:', error)
  }
}
