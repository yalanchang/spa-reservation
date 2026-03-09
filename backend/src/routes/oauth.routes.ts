import { Router } from 'express'
import { googleLogin, googleCallback, lineLogin, lineCallback } from '../controllers/oauth.controller'

const router = Router()

router.get('/google', googleLogin)
router.get('/google/callback', googleCallback)
router.get('/line', lineLogin)
router.get('/line/callback', lineCallback)

export default router