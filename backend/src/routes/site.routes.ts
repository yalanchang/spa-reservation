import { Router } from 'express'
import { getAnnouncements, getClosures } from '../controllers/site.controller'

const router = Router()

router.get('/announcements', getAnnouncements)
router.get('/closures', getClosures)

export default router
