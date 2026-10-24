import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { queryOne, execute } from '../models/db'
import { signToken } from '../utils/jwt'
import { isValidTaiwanPhone, normalizeTaiwanPhone } from '../utils/phone'
import { isValidCarrier, isValidTaxId, TW_CITIES } from '../utils/invoice'
import { sendVerificationCode, checkVerificationCode, MailError } from '../utils/verificationCode'
import { deleteImageByUrl } from '../config/cloudinary'

const GENDERS = ['female', 'male', 'other']
const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal', 'sensitive']

// 會員等級依「已完成」預約的累積消費
const TIERS = [
  { name: '金卡會員', min: 30000 },
  { name: '銀卡會員', min: 10000 },
  { name: '一般會員', min: 0 }
]

const PROFILE_FIELDS = `id, name, email, role, phone, city, address, emergency_name, emergency_phone,
  avatar, birthday, gender, preferred_staff_id, skin_type, care_notes,
  invoice_carrier, tax_id, marketing_opt_in, created_at,
  password <> '' AS has_password, google_id IS NOT NULL AS google_linked, line_id IS NOT NULL AS line_linked`

const loadProfile = async (userId: number) => {
  const user = await queryOne<any>(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`, [userId])
  if (!user) return null
  return {
    ...user,
    // DATE 欄位轉成 YYYY-MM-DD，前端不用處理時區
    birthday: user.birthday ? formatDate(user.birthday) : null,
    has_password: !!Number(user.has_password),
    marketing_opt_in: !!Number(user.marketing_opt_in),
    google_linked: !!Number(user.google_linked),
    line_linked: !!Number(user.line_linked)
  }
}

const formatDate = (value: Date | string) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fail = (res: Response, status: number, message: string) => {
  res.status(status).json({ success: false, message })
}

const serverError = (res: Response, label: string, error: unknown) => {
  if (error instanceof MailError) return fail(res, error.status, error.message)
  console.error(`${label}:`, error)
  fail(res, 500, '伺服器錯誤')
}

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await loadProfile(req.user!.userId)
    if (!user) return fail(res, 404, '帳號不存在')
    res.json({ success: true, data: user })
  } catch (error) {
    serverError(res, 'Get profile error', error)
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = text(req.body.name)
    const phone = text(req.body.phone)
    const city = text(req.body.city)
    const address = text(req.body.address)
    const emergencyName = text(req.body.emergencyName)
    const emergencyPhone = text(req.body.emergencyPhone)
    const invoiceCarrier = text(req.body.invoiceCarrier).toUpperCase()
    const taxId = text(req.body.taxId)
    const { birthday, gender } = req.body

    if (!name || name.length > 50) return fail(res, 400, '請填寫姓名（50 字以內）')
    if (phone && !isValidTaiwanPhone(phone)) {
      return fail(res, 400, '電話格式不正確：手機為 09 開頭共 10 碼，市話請加區碼')
    }
    if (birthday) {
      const d = new Date(`${birthday}T00:00:00`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || isNaN(d.getTime()) || d > new Date() || d.getFullYear() < 1900) {
        return fail(res, 400, '生日日期不正確')
      }
    }
    if (gender && !GENDERS.includes(gender)) return fail(res, 400, '性別選項不正確')
    if (city && !TW_CITIES.includes(city)) return fail(res, 400, '縣市選項不正確')
    if (address.length > 200) return fail(res, 400, '地址請在 200 字以內')
    if (emergencyName.length > 50) return fail(res, 400, '緊急聯絡人姓名請在 50 字以內')
    if (emergencyPhone && !isValidTaiwanPhone(emergencyPhone)) return fail(res, 400, '緊急聯絡人電話格式不正確')
    if (invoiceCarrier && !isValidCarrier(invoiceCarrier)) return fail(res, 400, '手機條碼格式不正確：「/」開頭加 7 碼')
    if (taxId && !isValidTaxId(taxId)) return fail(res, 400, '統一編號不正確，請再確認一次')

    await execute(
      `UPDATE users SET name = ?, phone = ?, birthday = ?, gender = ?, city = ?, address = ?,
         emergency_name = ?, emergency_phone = ?, invoice_carrier = ?, tax_id = ?, marketing_opt_in = ?
       WHERE id = ?`,
      [
        name,
        phone ? normalizeTaiwanPhone(phone) : null,
        birthday || null,
        gender || null,
        city || null,
        address || null,
        emergencyName || null,
        emergencyPhone ? normalizeTaiwanPhone(emergencyPhone) : null,
        invoiceCarrier || null,
        taxId || null,
        req.body.marketingOptIn ? 1 : 0,
        req.user!.userId
      ]
    )

    res.json({ success: true, message: '資料已更新', data: await loadProfile(req.user!.userId) })
  } catch (error) {
    serverError(res, 'Update profile error', error)
  }
}

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { preferredStaffId, skinType } = req.body
    const careNotes = typeof req.body.careNotes === 'string' ? req.body.careNotes.trim() : ''

    if (skinType && !SKIN_TYPES.includes(skinType)) return fail(res, 400, '膚質選項不正確')
    if (careNotes.length > 500) return fail(res, 400, '注意事項請在 500 字以內')
    if (preferredStaffId) {
      const staff = await queryOne('SELECT id FROM staff WHERE id = ? AND is_active = 1', [preferredStaffId])
      if (!staff) return fail(res, 400, '找不到這位美容師')
    }

    await execute(
      'UPDATE users SET preferred_staff_id = ?, skin_type = ?, care_notes = ? WHERE id = ?',
      [preferredStaffId || null, skinType || null, careNotes || null, req.user!.userId]
    )

    res.json({ success: true, message: '偏好已更新', data: await loadProfile(req.user!.userId) })
  } catch (error) {
    serverError(res, 'Update preferences error', error)
  }
}

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body
    if (typeof newPassword !== 'string' || newPassword.length < 6) return fail(res, 400, '新密碼至少要 6 個字元')

    const user = await queryOne<any>('SELECT password FROM users WHERE id = ?', [req.user!.userId])
    if (!user) return fail(res, 404, '帳號不存在')

    // 用 Google、LINE 註冊的帳號還沒有密碼，可以直接設定
    if (user.password) {
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
        return fail(res, 400, '目前的密碼不正確')
      }
      if (await bcrypt.compare(newPassword, user.password)) return fail(res, 400, '新密碼不能跟目前的密碼一樣')
    }

    await execute('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(newPassword, 12), req.user!.userId])
    res.json({ success: true, message: user.password ? '密碼已更新' : '密碼已設定，之後也可以用信箱和密碼登入' })
  } catch (error) {
    serverError(res, 'Change password error', error)
  }
}

// 更換信箱第一步：確認密碼後寄驗證碼到新信箱
export const requestEmailChange = async (req: Request, res: Response): Promise<void> => {
  try {
    const newEmail = typeof req.body.newEmail === 'string' ? req.body.newEmail.trim().toLowerCase() : ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return fail(res, 400, '電子郵件格式不正確')

    const user = await queryOne<any>('SELECT id, name, email, password FROM users WHERE id = ?', [req.user!.userId])
    if (!user) return fail(res, 404, '帳號不存在')
    if (newEmail === user.email) return fail(res, 400, '這就是你目前的信箱')
    if (user.password && !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
      return fail(res, 400, '密碼不正確')
    }

    const taken = await queryOne('SELECT id FROM users WHERE email = ?', [newEmail])
    if (taken) return fail(res, 400, '這個信箱已經被其他帳號使用')

    const { waitSeconds } = await sendVerificationCode(user, 'change_email', { to: newEmail, payload: newEmail })
    res.json({ success: true, message: `驗證碼已寄到 ${newEmail}`, data: { waitSeconds } })
  } catch (error) {
    serverError(res, 'Request email change error', error)
  }
}

// 更換信箱第二步：新信箱收到的驗證碼正確才更換，並換發新的登入憑證
export const confirmEmailChange = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await checkVerificationCode(req.user!.userId, 'change_email', String(req.body.code || '').trim())
    if (!result.ok) return fail(res, 400, result.message)

    const newEmail = result.payload
    if (!newEmail) return fail(res, 400, '驗證碼已過期，請重新申請')
    const taken = await queryOne('SELECT id FROM users WHERE email = ? AND id <> ?', [newEmail, req.user!.userId])
    if (taken) return fail(res, 400, '這個信箱已經被其他帳號使用')

    await execute('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?', [newEmail, req.user!.userId])

    const user = await loadProfile(req.user!.userId)
    const token = signToken({ userId: user.id, email: user.email, role: user.role, ...(req.user!.mfa ? { mfa: true } : {}) })
    res.json({ success: true, message: '信箱已更換', data: { token, user } })
  } catch (error) {
    serverError(res, 'Confirm email change error', error)
  }
}

export const removeAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<any>('SELECT avatar FROM users WHERE id = ?', [req.user!.userId])
    await execute('UPDATE users SET avatar = NULL WHERE id = ?', [req.user!.userId])
    await deleteImageByUrl(user?.avatar)
    res.json({ success: true, message: '大頭貼已移除', data: await loadProfile(req.user!.userId) })
  } catch (error) {
    serverError(res, 'Remove avatar error', error)
  }
}

// 會員概況：等級、到店次數、累積消費、最常做的療程、下一筆預約
export const getSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId
    const stats = await queryOne<any>(
      `SELECT COUNT(*) AS visits, COALESCE(SUM(price), 0) AS spent
       FROM appointments WHERE user_id = ? AND status = 'completed'`,
      [userId]
    )
    const favorite = await queryOne<any>(
      `SELECT s.name, COUNT(*) AS times FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.user_id = ? AND a.status = 'completed'
       GROUP BY s.id, s.name ORDER BY times DESC, MAX(a.appointment_date) DESC LIMIT 1`,
      [userId]
    )
    const next = await queryOne<any>(
      `SELECT a.id, a.appointment_date, a.start_time, s.name AS service_name, st.name AS staff_name
       FROM appointments a JOIN services s ON s.id = a.service_id JOIN staff st ON st.id = a.staff_id
       WHERE a.user_id = ? AND a.status IN ('pending', 'confirmed')
         AND TIMESTAMP(a.appointment_date, a.start_time) > NOW()
       ORDER BY a.appointment_date, a.start_time LIMIT 1`,
      [userId]
    )
    const reviews = await queryOne<any>('SELECT COUNT(*) AS count FROM reviews WHERE user_id = ?', [userId])
    const user = await queryOne<any>('SELECT created_at FROM users WHERE id = ?', [userId])

    const spent = Number(stats?.spent || 0)
    const tier = TIERS.find((t) => spent >= t.min)!
    const nextTier = [...TIERS].reverse().find((t) => t.min > spent) || null

    res.json({
      success: true,
      data: {
        tier: tier.name,
        nextTier: nextTier ? { name: nextTier.name, remaining: nextTier.min - spent, min: nextTier.min } : null,
        currentTierMin: tier.min,
        visits: Number(stats?.visits || 0),
        spent,
        reviewCount: Number(reviews?.count || 0),
        favoriteService: favorite ? { name: favorite.name, times: Number(favorite.times) } : null,
        nextAppointment: next
          ? { ...next, appointment_date: formatDate(next.appointment_date), start_time: next.start_time.slice(0, 5) }
          : null,
        memberSince: user ? formatDate(user.created_at) : null
      }
    })
  } catch (error) {
    serverError(res, 'Get summary error', error)
  }
}

// 刪除帳號：要再確認一次；預約紀錄保留給店家（不再連到帳號），心得一併刪除
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<any>('SELECT id, role, password, avatar FROM users WHERE id = ?', [req.user!.userId])
    if (!user) return fail(res, 404, '帳號不存在')
    if (user.role !== 'customer') return fail(res, 400, '後台帳號請由管理員停用')

    if (user.password) {
      if (!(await bcrypt.compare(String(req.body.password || ''), user.password))) return fail(res, 400, '密碼不正確')
    } else if (req.body.confirmText !== '刪除帳號') {
      return fail(res, 400, '請輸入「刪除帳號」確認')
    }

    // 還沒到的預約先取消，讓店家知道時段空出來了
    await execute(
      `UPDATE appointments SET status = 'cancelled'
       WHERE user_id = ? AND status IN ('pending', 'confirmed') AND TIMESTAMP(appointment_date, start_time) > NOW()`,
      [user.id]
    )
    await execute('DELETE FROM reviews WHERE user_id = ?', [user.id])
    await execute('DELETE FROM users WHERE id = ?', [user.id])

    await deleteImageByUrl(user.avatar)

    res.json({ success: true, message: '帳號已刪除' })
  } catch (error) {
    serverError(res, 'Delete account error', error)
  }
}
