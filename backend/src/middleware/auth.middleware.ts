import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
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

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '請先登入' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: '權限不足' })
      return
    }

    next()
  }
}
