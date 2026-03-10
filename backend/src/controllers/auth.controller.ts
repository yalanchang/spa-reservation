import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { queryOne, execute } from '../models/db'
import { signToken } from '../utils/jwt'
import type { User } from '../types'
import { v2 as cloudinary } from 'cloudinary'

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, message: '請輸入帳號密碼' })
      return
    }

    const user = await queryOne<User>(
      `SELECT id, name, email, password, role, phone 
       FROM users WHERE email = ? AND is_active = 1`,
      [email]
    )

    if (!user) {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
      return
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
      return
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      message: '登入成功',
      data: { token, user: userWithoutPassword }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body

    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existingUser) {
      res.status(400).json({ success: false, message: '此信箱已被註冊' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await execute(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES (?, ?, ?, ?, 'customer')`,
      [name, email, hashedPassword, phone]
    )

    res.json({
      success: true,
      message: '註冊成功',
      data: { userId: (result as any).insertId }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    const user = await queryOne(
      `SELECT id, name, email, role, phone, avatar, created_at 
       FROM users WHERE id = ?`,
      [req.user.userId]
    )

    res.json({ success: true, data: user })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    const { name, phone, password } = req.body
    

    if (password) {
      const hashed = await bcrypt.hash(password, 12)
      await execute(
        'UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?',
        [name, phone, hashed, req.user.userId]
      )
    } else {
      await execute(
        'UPDATE users SET name = ?, phone = ? WHERE id = ?',
        [name, phone, req.user.userId]
      )
    }

    const updated = await queryOne(
      'SELECT id, name, email, role, phone, avatar FROM users WHERE id = ?',
      [req.user.userId]
    )

    res.json({ success: true, message: '資料已更新', data: updated })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: '請選擇圖片' })
      return
    }

    // Cloudinary 直接回傳完整 URL
    const avatarUrl = (req.file as any).path

    // 刪除舊頭像（Cloudinary 版本）
    const old = await queryOne<any>(
      'SELECT avatar FROM users WHERE id = ?',
      [req.user.userId]
    )
    if (old?.avatar && old.avatar.includes('cloudinary')) {
      // 從 URL 取得 public_id 並刪除
      const publicId = old.avatar
        .split('/')
        .slice(-2)
        .join('/')
        .replace(/\.[^/.]+$/, '')
      await cloudinary.uploader.destroy(publicId)
    }

    await execute(
      'UPDATE users SET avatar = ? WHERE id = ?',
      [avatarUrl, req.user.userId]
    )

    res.json({ success: true, message: '頭像已更新', data: { avatar: avatarUrl } })
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}