import { Router } from 'express'
import { 
  getServices, 
  getServiceById, 
  getCategories 
} from '../controllers/services.controller'

const router = Router()

router.get('/', getServices)
router.get('/categories', getCategories)
router.get('/:id', getServiceById)

export default router
