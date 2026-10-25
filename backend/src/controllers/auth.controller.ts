import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { queryOne, execute } from '../models/db'
import { signToken } from '../utils/jwt'
import type { User } from '../types'
import { DEMO_ADMIN_EMAIL, demoLoginEnabled } from '../utils/demo'
import { uploadAvatarImage, deleteImageByUrl } from '../config/cloudinary'
import {
  sendVerificationCode,
  checkVerificationCode,
  issueResetToken,
  consumeResetToken,
  MailError
} from '../utils/verificationCode'

// 登入成功的回應：發 token，回傳不含密碼的使用者資料
const sessionResponse = (res: Response, user: any, message: string, mfa = false) => {
  const token = signToken({ userId: user.id, email: user.email, role: user.role, ...(mfa ? { mfa: true } : {}) })
  const { password: _, email_verified: __, is_active: ___, ...safeUser } = user
  res.json({ success: true, message, data: { token, user: safeUser } })
}

const findActiveUser = (email: unknown) =>
  queryOne<any>(
    `SELECT id, name, email, password, role, phone, avatar, email_verified, must_change_password
     FROM users WHERE email = ? AND is_active = 1`,
    [typeof email === 'string' ? email.trim().toLowerCase() : '']
  )

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, message: '請輸入帳號密碼' })
      return
    }

    const user = await findActiveUser(email)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
      return
    }

    // 還沒驗證信箱：重寄驗證碼，前端導到驗證頁
    if (!Number(user.email_verified)) {
      // 寄信失敗也導到驗證頁，那裡可以再按重寄
      const sent = await sendVerificationCode(user, 'register').then(
        () => true,
        () => false
      )
      res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        message: sent
          ? '請先完成信箱驗證，驗證碼已寄到你的信箱'
          : '請先完成信箱驗證，驗證碼寄送失敗，請在下一頁按「重新寄送」'
      })
      return
    }

    sessionResponse(res, user, '登入成功')
  } catch (error) {
    if (error instanceof MailError) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, password, phone } = req.body
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''

    if (!name || !email || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: '請填寫姓名、信箱，密碼至少 6 個字元' })
      return
    }

    const existingUser = await queryOne<any>('SELECT id, email_verified FROM users WHERE email = ?', [email])

    if (existingUser && Number(existingUser.email_verified)) {
      res.status(400).json({ success: false, message: '此信箱已被註冊' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    if (existingUser) {
      // 註冊過但還沒驗證（例如上次驗證信沒寄出去）：用這次填的資料覆蓋，再寄一次驗證碼
      await execute('UPDATE users SET name = ?, password = ?, phone = ? WHERE id = ?', [
        name,
        hashedPassword,
        phone || null,
        existingUser.id
      ])
    } else {
      await execute(
        `INSERT INTO users (name, email, password, phone, role, email_verified)
         VALUES (?, ?, ?, ?, 'customer', 0)`,
        [name, email, hashedPassword, phone || null]
      )
    }

    const user = await findActiveUser(email)
    await sendVerificationCode(user, 'register')

    res.json({
      success: true,
      message: '註冊成功，驗證碼已寄到你的信箱',
      data: { email }
    })
  } catch (error) {
    if (error instanceof MailError) {
      res.status(error.status).json({ success: false, message: `${error.message}，請稍後再按一次註冊` })
      return
    }
    console.error('Register error:', error)
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
      res.status(400).json({ success: false, message: '沒有收到圖片', hint: '請重新選擇一張圖片' })
      return
    }

    let avatarUrl: string
    try {
      avatarUrl = (await uploadAvatarImage(req.file.buffer)).secure_url
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      res
        .status(502)
        .json({ success: false, message: '圖片儲存服務暫時無法使用', hint: '請稍後再試，若一直失敗請聯絡我們' })
      return
    }

    const old = await queryOne<any>('SELECT avatar FROM users WHERE id = ?', [req.user.userId])

    await execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user.userId])

    // 資料庫已經換成新圖，才刪掉舊的；更新失敗時舊圖還在
    await deleteImageByUrl(old?.avatar)

    res.json({ success: true, message: '頭像已更新', data: { avatar: avatarUrl } })
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤', hint: '請稍後再試，若一直失敗請聯絡我們' })
  }
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await findActiveUser(req.body.email)
    if (!user) {
      res.status(400).json({ success: false, message: '驗證碼不正確' })
      return
    }
    if (Number(user.email_verified)) {
      res.status(400).json({ success: false, message: '這個信箱已經驗證過了，請直接登入' })
      return
    }

    const result = await checkVerificationCode(user.id, 'register', String(req.body.code || '').trim())
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message })
      return
    }

    await execute('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id])
    // 驗證完直接登入
    sessionResponse(res, user, '信箱驗證完成')
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 重新寄送驗證碼；不論信箱是否存在都回相同訊息
export const resendCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const purpose = req.body.purpose
    if (!['register', 'reset'].includes(purpose)) {
      res.status(400).json({ success: false, message: '參數不正確' })
      return
    }

    const user = await findActiveUser(req.body.email)
    let waitSeconds = 60
    const eligible = user && (purpose === 'register' ? !Number(user.email_verified) : true)

    if (eligible) {
      waitSeconds = (await sendVerificationCode(user, purpose)).waitSeconds
    }

    res.json({ success: true, message: '如果資料正確，驗證碼會寄到你的信箱', data: { waitSeconds } })
  } catch (error) {
    if (error instanceof MailError) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    console.error('Resend code error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 忘記密碼第一步：確認信箱有註冊後寄出驗證碼
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : ''
    if (!email) {
      res.status(400).json({ success: false, message: '請輸入電子郵件' })
      return
    }

    const user = await findActiveUser(email)
    if (!user) {
      res.status(404).json({ success: false, code: 'EMAIL_NOT_FOUND', message: '這個信箱還沒有註冊' })
      return
    }
    // 從後台申請時，只接受後台帳號
    if (req.body.scope === 'admin' && !['admin', 'staff'].includes(user.role)) {
      res.status(404).json({ success: false, code: 'NOT_STAFF', message: '這個信箱沒有後台帳號' })
      return
    }

    const { waitSeconds } = await sendVerificationCode(user, 'reset')
    res.json({ success: true, message: `驗證碼已寄到 ${user.email}`, data: { waitSeconds } })
  } catch (error) {
    if (error instanceof MailError) {
      res.status(error.status).json({ success: false, message: error.message })
      return
    }
    console.error('Forgot password error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 忘記密碼第二步：核對驗證碼，正確才發出重設憑證
export const verifyResetCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await findActiveUser(req.body.email)
    if (!user) {
      res.status(400).json({ success: false, message: '驗證碼不正確' })
      return
    }

    const result = await checkVerificationCode(user.id, 'reset', String(req.body.code || '').trim())
    if (!result.ok) {
      res.status(400).json({ success: false, message: result.message })
      return
    }

    const resetToken = await issueResetToken(user.id)
    res.json({ success: true, message: '驗證成功，請設定新密碼', data: { resetToken } })
  } catch (error) {
    console.error('Verify reset code error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 忘記密碼第三步：帶著重設憑證設定新密碼
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password, resetToken } = req.body
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: '新密碼至少要 6 個字元' })
      return
    }

    const user = await findActiveUser(req.body.email)
    if (!user || typeof resetToken !== 'string' || !(await consumeResetToken(user.id, resetToken))) {
      res.status(400).json({ success: false, code: 'RESET_EXPIRED', message: '驗證已過期，請重新取得驗證碼' })
      return
    }

    const hashed = await bcrypt.hash(password, 12)
    // 能收到驗證碼就代表信箱是本人的，順便標為已驗證
    await execute('UPDATE users SET password = ?, email_verified = 1, must_change_password = 0 WHERE id = ?', [
      hashed,
      user.id
    ])

    res.json({ success: true, message: '密碼已重設，請用新密碼登入' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 後台登入：帳號密碼正確且有後台權限就登入；發出的 token 標記為後台登入，前台登入的 token 進不了後台
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ success: false, message: '請輸入帳號密碼' })
      return
    }

    const user = await findActiveUser(email)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, message: '帳號或密碼錯誤' })
      return
    }
    if (!['admin', 'staff'].includes(user.role)) {
      res.status(403).json({ success: false, message: '此帳號沒有後台權限' })
      return
    }

    sessionResponse(res, user, '登入成功', true)
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 後台登入頁用來決定要不要顯示「展示帳號」按鈕
export const adminDemoStatus = (req: Request, res: Response): void => {
  res.json({ success: true, data: { enabled: demoLoginEnabled() } })
}

// 展示帳號一鍵登入：帳號不存在就自動建立（隨機密碼，只能從這裡登入），被停權或降級也會恢復
export const adminDemoLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!demoLoginEnabled()) {
      res.status(404).json({ success: false, message: '目前沒有開放展示帳號' })
      return
    }
    await execute(
      `INSERT INTO users (name, email, password, role, email_verified, is_active) VALUES (?, ?, ?, 'admin', 1, 1)
       ON DUPLICATE KEY UPDATE role = 'admin', is_active = 1, email_verified = 1`,
      ['展示帳號', DEMO_ADMIN_EMAIL, await bcrypt.hash(crypto.randomUUID(), 12)]
    )
    const user = await findActiveUser(DEMO_ADMIN_EMAIL)
    const token = signToken({ userId: user.id, email: user.email, role: user.role, mfa: true, demo: true })
    const { password: _, email_verified: __, is_active: ___, ...safeUser } = user
    res.json({ success: true, message: '已用展示帳號登入', data: { token, user: safeUser } })
  } catch (error) {
    console.error('Admin demo login error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}
