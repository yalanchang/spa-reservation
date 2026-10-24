import { Router } from 'express'
import {
  createAppointment,
  getAvailableSlots,
  getUserAppointments,
  deleteAppointment,
  updateAppointment,
  markNoticesRead,
  checkCoupon
} from '../controllers/appointments.controller'
import { authenticate, optionalAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/available', optionalAuth, getAvailableSlots)
router.post('/coupon', authenticate, checkCoupon)
router.post('/', authenticate, createAppointment)
router.get('/my', authenticate, getUserAppointments)
router.post('/notices/read', authenticate, markNoticesRead)
router.put('/:id', authenticate, updateAppointment)
router.delete('/:id', authenticate, deleteAppointment)

export default router
