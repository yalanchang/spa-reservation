import { Router } from 'express'
import { getStaff } from '../controllers/staff.controller'

const router = Router()

router.get('/', getStaff)

export default router
