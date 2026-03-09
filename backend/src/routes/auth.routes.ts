import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { login, register, getProfile, updateProfile, uploadAvatar } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

const uploadDir = path.join(__dirname, '../../public/uploads/avatars')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Multer 設定
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `avatar-${Date.now()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只允許 JPG、PNG、WebP 格式'))
    }
  }
})

router.post('/login', login)
router.post('/register', register)
router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.post('/avatar', authenticate, (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: '圖片太大，請上傳 10MB 以內的圖片' })
      } else if (err) {
        return res.status(400).json({ success: false, message: err.message })
      }
      next()
    })
  }, uploadAvatar)
export default router