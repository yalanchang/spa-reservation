import { Router } from 'express'
import {
  login,
  register,
  uploadAvatar,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  resendCode,
  adminLogin
} from '../controllers/auth.controller'
import {
  getProfile,
  updateProfile,
  updatePreferences,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  removeAvatar,
  getSummary,
  deleteAccount
} from '../controllers/profile.controller'
import { authenticate } from '../middleware/auth.middleware'
import { upload } from '../config/cloudinary'
import multer from 'multer'

const router = Router()

router.post('/login', login)
router.post('/register', register)
router.post('/forgot-password', forgotPassword)
router.post('/verify-reset-code', verifyResetCode)
router.post('/reset-password', resetPassword)
router.post('/verify-email', verifyEmail)
router.post('/resend-code', resendCode)
router.post('/admin/login', adminLogin)
// 個人資料
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.put('/profile/preferences', authenticate, updatePreferences)
router.get('/profile/summary', authenticate, getSummary)
router.put('/password', authenticate, changePassword)
router.post('/email/request', authenticate, requestEmailChange)
router.post('/email/confirm', authenticate, confirmEmailChange)
router.delete('/avatar', authenticate, removeAvatar)
router.delete('/account', authenticate, deleteAccount)
// 把上傳錯誤轉成使用者看得懂的原因與建議
const describeAvatarError = (err: any): { message: string; hint: string } => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { message: '圖片超過 10MB', hint: '請壓縮圖片，或改用較小的照片後再試' }
    }
    return { message: '圖片上傳失敗', hint: '請重新整理頁面，再選一次圖片' }
  }
  if (/format|not allowed/i.test(err?.message || '')) {
    return {
      message: '不支援這種圖片格式',
      hint: '請使用 JPG、PNG 或 WebP；iPhone 的 HEIC 照片可以先截圖或轉成 JPG'
    }
  }
  console.error('Avatar upload error:', err)
  return { message: '圖片儲存服務暫時無法使用', hint: '請稍後再試，若一直失敗請聯絡我們' }
}

router.post('/avatar', authenticate, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      const { message, hint } = describeAvatarError(err)
      return res.status(400).json({ success: false, message, hint })
    }
    next()
  })
}, uploadAvatar)

export default router