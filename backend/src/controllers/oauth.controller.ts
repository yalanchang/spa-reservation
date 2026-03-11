import { Request, Response } from 'express'
import axios from 'axios'
import { queryOne, execute } from '../models/db'
import { signToken } from '../utils/jwt'

// ========== GOOGLE ==========
export const googleLogin = (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL!,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

export const googleCallback = async (req: Request, res: Response) => {
  const { code } = req.query
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

  try {
    // 換取 token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    })

    // 取得用戶資料
    const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    })

    
    const googleId = userRes.data.id
    const email = userRes.data.email || null  
    const name = userRes.data.name || 'Google'
    const picture = userRes.data.picture || null
  
    // 檢查必要欄位
    if (!googleId) {
      throw new Error('Google ID is missing')
    }
    // 查找或建立用戶
    let user = await queryOne<any>(
      'SELECT * FROM users WHERE email = ? OR google_id = ?',
      [email, googleId]
    )

    if (!user) {
      const result = await execute(
        `INSERT INTO users (name, email, google_id, avatar, role, is_active) VALUES (?, ?, ?, ?, 'customer', 1)`,
        [name, email, googleId, picture]
      )
      user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [(result as any).insertId])
    } else if (!user.google_id) {
      await execute('UPDATE users SET google_id = ?, avatar = ? WHERE id = ?', [googleId, picture, user.id])
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    res.redirect(`${frontendUrl}/oauth/callback?token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}&id=${user.id}&avatar=${encodeURIComponent(user.avatar || '')}`)
  } catch (err) {
    console.error('Google callback error:', err)
    res.redirect(`${frontendUrl}/login?error=google_failed`)
  }
}

// ========== LINE ==========
export const lineLogin = (req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(7)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINE_CHANNEL_ID!,
    redirect_uri: process.env.LINE_CALLBACK_URL!,
    state,
    scope: 'profile openid email'
  })
  res.redirect(`https://access.line.me/oauth2/v2.1/authorize?${params}`)
}

export const lineCallback = async (req: Request, res: Response) => {
  const { code } = req.query
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

  try {
    // 換取 token
    const tokenRes = await axios.post('https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.LINE_CALLBACK_URL!,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!
      }).toString(), 
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    // 取得用戶資料
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    })

    const { userId: lineId, displayName: name, pictureUrl: avatar } = profileRes.data

    // 查找或建立用戶
    let user = await queryOne<any>('SELECT * FROM users WHERE line_id = ?', [lineId])

    if (!user) {
        const nameSlug = name
        .toLowerCase()
        .replace(/\s+/g, '.')     // 空白變點
        .replace(/[^a-z0-9.]/g, '') // 移除特殊字元
        .substring(0, 20)         // 限制長度
      
      const fakeEmail = `${nameSlug}.${Math.floor(Math.random() * 1000)}@line.user`
      const result = await execute(
        `INSERT INTO users (name, email, line_id, avatar, role, is_active)   VALUES (?, ?, ?, ?, 'customer', 1, NULL)`,
        [name, fakeEmail, lineId, avatar]
      )
      user = await queryOne<any>('SELECT * FROM users WHERE id = ?', [(result as any).insertId])
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role })
    res.redirect(
        `${frontendUrl}/oauth/callback?` +
        `token=${token}&` +
        `name=${encodeURIComponent(user.name)}&` +
        `email=${encodeURIComponent(user.email)}&` +
        `role=${user.role}&` +
        `id=${user.id}&` +
        `avatar=${encodeURIComponent(user.avatar || '')}`
      )  } catch (err) {
    console.error('LINE callback error:', err)
    res.redirect(`${frontendUrl}/login?error=line_failed`)
  }
}