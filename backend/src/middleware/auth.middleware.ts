import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { queryOne } from '../models/db'
import type { JwtPayload } from '../types'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: '請先登入' })
      return
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)

    if (!user) {
      res.status(401).json({ success: false, message: '無效的授權' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: '授權失敗' })
  }
}

// 有帶 token 就解析，沒帶也放行（公開 API 想知道是誰時用）
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const user = verifyToken(authHeader.substring(7))
    if (user) req.user = user
  }
  next()
}

// 店家後台：每次都從資料庫確認角色，權限被移除後舊 token 立即失效
const requireRole = (roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: '請先登入' })
        return
      }

      // 前台登入拿到的 token 不能進後台，要從後台登入頁登入
      if (!req.user.mfa) {
        res.status(403).json({ success: false, code: 'ADMIN_LOGIN_REQUIRED', message: '請從後台登入頁登入' })
        return
      }

      const user = await queryOne<any>(
        'SELECT role, is_active FROM users WHERE id = ?',
        [req.user.userId]
      )

      if (!user || !user.is_active || !roles.includes(user.role)) {
        res.status(403).json({ success: false, message: '權限不足' })
        return
      }

      next()
    } catch (error) {
      console.error('Require role error:', error)
      res.status(500).json({ success: false, message: '伺服器錯誤' })
    }
  }

export const requireStaff = requireRole(['admin', 'staff'])
export const requireAdmin = requireRole(['admin'])
