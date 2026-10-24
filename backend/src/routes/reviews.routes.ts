import { Router } from 'express'
import { createReview, getServiceReviews } from '../controllers/reviews.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/service/:serviceId', getServiceReviews)
router.post('/', authenticate, createReview)

export default router
