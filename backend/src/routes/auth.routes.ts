import { Router } from 'express'
import { login, register, getProfile, updateProfile, uploadAvatar } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { upload } from '../config/cloudinary'
import multer from 'multer'

const router = Router()

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