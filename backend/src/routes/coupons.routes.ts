import { Router } from 'express'
import { getCouponCenter, claim, claimAll, getMyCoupons } from '../controllers/coupons.controller'
import { authenticate, optionalAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/center', optionalAuth, getCouponCenter)
router.get('/mine', authenticate, getMyCoupons)
router.post('/claim-all', authenticate, claimAll)
router.post('/:id/claim', authenticate, claim)

export default router
