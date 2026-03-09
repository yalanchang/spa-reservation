import { Router } from 'express'
import { 
  createAppointment, 
  getAvailableSlots,
  getUserAppointments 
} from '../controllers/appointments.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.get('/available', getAvailableSlots)
router.post('/', authenticate, createAppointment)
router.get('/my', authenticate, getUserAppointments)

export default router
