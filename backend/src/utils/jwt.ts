import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface TokenPayload {
  userId: number
  email: string
  role: string
  // 從後台登入頁登入才有，後台 API 只認這種 token
  mfa?: boolean
  // 展示帳號：不能變更帳號權限與個人資料
  demo?: boolean
}

export const signToken = (payload: TokenPayload): string => {
  const options: any = { expiresIn: JWT_EXPIRES_IN }
  return jwt.sign(payload, JWT_SECRET, options)
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded as TokenPayload
  } catch (error) {
    return null
  }
}
