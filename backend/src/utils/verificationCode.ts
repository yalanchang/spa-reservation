import crypto from 'crypto'
import { queryOne, execute } from '../models/db'
import { sendMail } from './mailer'
import { verificationCodeHtml } from './emailTemplate'

export type CodePurpose = 'register' | 'reset' | 'change_email'

// 忘記密碼核對驗證碼後發出的一次性重設憑證，也存在同一張表
const RESET_TOKEN_PURPOSE = 'reset_token'
const RESET_TOKEN_MINUTES = 10

// 寄信失敗時丟出，控制器會回給使用者「寄送失敗」而不是「伺服器錯誤」
export class MailError extends Error {
  status = 502
  constructor() {
    super('驗證信寄送失敗，請稍後再試')
  }
}

const EXPIRE_MINUTES = 10
const MAX_ATTEMPTS = 5
const RESEND_SECONDS = 60

const PURPOSE_TEXT: Record<CodePurpose, { subject: string; action: string }> = {
  register: { subject: '信箱驗證碼', action: '完成註冊' },
  reset: { subject: '重設密碼驗證碼', action: '重設密碼' },
  change_email: { subject: '更換信箱驗證碼', action: '確認新的信箱' }
}

// 用伺服器密鑰做雜湊，資料庫外洩也無法反推出驗證碼
const hashCode = (userId: number, purpose: string, code: string) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'default-secret-key')
    .update(`${userId}:${purpose}:${code}`)
    .digest('hex')

/**
 * 產生並寄出 6 位數驗證碼。60 秒內寄過就不再寄，回傳還要等幾秒。
 */
export const sendVerificationCode = async (
  user: { id: number; name: string; email: string },
  purpose: CodePurpose,
  // 更換信箱時寄到新信箱，並把新信箱暫存起來
  options: { to?: string; payload?: string } = {}
): Promise<{ sent: boolean; waitSeconds: number }> => {
  const recent = await queryOne<any>(
    `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age FROM verification_codes
     WHERE user_id = ? AND purpose = ? ORDER BY id DESC LIMIT 1`,
    [user.id, purpose]
  )
  if (recent && Number(recent.age) < RESEND_SECONDS) {
    return { sent: false, waitSeconds: RESEND_SECONDS - Number(recent.age) }
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  await execute('DELETE FROM verification_codes WHERE user_id = ? AND purpose = ?', [user.id, purpose])
  await execute(
    `INSERT INTO verification_codes (user_id, purpose, code_hash, payload, expires_at)
     VALUES (?, ?, ?, ?, NOW() + INTERVAL ${EXPIRE_MINUTES} MINUTE)`,
    [user.id, purpose, hashCode(user.id, purpose, code), options.payload || null]
  )

  const { subject, action } = PURPOSE_TEXT[purpose]
  // 信裡寫上寄出時間，收到多封時才分得出哪封是最新的
  const sentAt = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })
  try {
    await sendMail({
    to: options.to || user.email,
    subject: `${subject}：${code}`,
    text: `${user.name} 你好：\n\n你的驗證碼是 ${code}（${sentAt} 寄出），請在 ${EXPIRE_MINUTES} 分鐘內輸入以${action}。\n重新寄送後，舊的驗證碼就會失效，請以最新一封為準。\n\n如果不是你本人操作，請忽略這封信。`,
    html: verificationCodeHtml({ name: user.name, title: subject, action, code, minutes: EXPIRE_MINUTES, sentAt })
    })
  } catch (error) {
    // 沒寄出去就刪掉這組驗證碼，使用者可以馬上再試，不用等 60 秒
    console.error('Send verification mail error:', error)
    await execute('DELETE FROM verification_codes WHERE user_id = ? AND purpose = ?', [user.id, purpose])
    throw new MailError()
  }

  return { sent: true, waitSeconds: RESEND_SECONDS }
}

/**
 * 檢查驗證碼。正確就刪除（只能用一次）；錯誤累計次數，超過上限就作廢。
 */
export const checkVerificationCode = async (
  userId: number,
  purpose: CodePurpose,
  code: string
): Promise<{ ok: true; payload: string | null } | { ok: false; message: string }> => {
  const record = await queryOne<any>(
    `SELECT id, code_hash, payload, attempts, expires_at > NOW() AS valid FROM verification_codes
     WHERE user_id = ? AND purpose = ? ORDER BY id DESC LIMIT 1`,
    [userId, purpose]
  )

  if (!record || !Number(record.valid)) {
    return { ok: false, message: '驗證碼已過期，請重新寄送' }
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: '錯誤次數太多，請重新寄送驗證碼' }
  }

  if (!/^\d{6}$/.test(code) || hashCode(userId, purpose, code) !== record.code_hash) {
    await execute('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?', [record.id])
    const left = MAX_ATTEMPTS - record.attempts - 1
    return {
      ok: false,
      message: left > 0 ? `驗證碼不正確，還可以再試 ${left} 次` : '錯誤次數太多，請重新寄送驗證碼'
    }
  }

  await execute('DELETE FROM verification_codes WHERE id = ?', [record.id])
  return { ok: true, payload: record.payload }
}

/**
 * 驗證碼核對成功後發出重設憑證（10 分鐘內有效、只能用一次）
 */
export const issueResetToken = async (userId: number): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex')
  await execute('DELETE FROM verification_codes WHERE user_id = ? AND purpose = ?', [userId, RESET_TOKEN_PURPOSE])
  await execute(
    `INSERT INTO verification_codes (user_id, purpose, code_hash, expires_at)
     VALUES (?, ?, ?, NOW() + INTERVAL ${RESET_TOKEN_MINUTES} MINUTE)`,
    [userId, RESET_TOKEN_PURPOSE, hashCode(userId, RESET_TOKEN_PURPOSE, token)]
  )
  return token
}

/**
 * 用掉重設憑證：正確就刪除並回傳 true
 */
export const consumeResetToken = async (userId: number, token: string): Promise<boolean> => {
  const record = await queryOne<any>(
    `SELECT id FROM verification_codes
     WHERE user_id = ? AND purpose = ? AND code_hash = ? AND expires_at > NOW()`,
    [userId, RESET_TOKEN_PURPOSE, hashCode(userId, RESET_TOKEN_PURPOSE, token)]
  )
  if (!record) return false
  await execute('DELETE FROM verification_codes WHERE id = ?', [record.id])
  return true
}
