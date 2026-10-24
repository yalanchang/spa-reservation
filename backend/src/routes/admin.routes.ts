import { Router } from 'express'
import {
  getStats,
  listAppointments,
  updateAppointmentStatus,
  listReviews,
  replyReview,
  listStaffUsers,
  createStaffUser,
  updateUserRole,
  deactivateStaffUser
} from '../controllers/admin.controller'
import {
  listCategories,
  saveCategory,
  listAdminServices,
  saveService,
  setServiceActive,
  listAdminStaff,
  saveStaff,
  setStaffActive,
  getStaffSchedule,
  saveStaffSchedule,
  addStaffLeave,
  deleteStaffLeave
} from '../controllers/adminCatalog.controller'
import {
  listCustomers,
  getCustomer,
  updateCustomerNote,
  setCustomerActive,
  getAdminSlots,
  createAdminAppointment,
  exportAppointments,
  listCoupons,
  saveCoupon,
  listAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  listClosures,
  addClosure,
  deleteClosure,
  getReports,
  listLogs
} from '../controllers/adminOps.controller'
import { authenticate, requireStaff, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate, requireStaff)

router.get('/stats', getStats)
router.get('/appointments', listAppointments)
router.get('/appointments/export', exportAppointments)
router.get('/appointments/slots', getAdminSlots)
router.post('/appointments', createAdminAppointment)
router.patch('/appointments/:id/status', updateAppointmentStatus)
router.get('/reviews', listReviews)
router.put('/reviews/:id/reply', replyReview)

// 會員：美容師可以查詢與寫備註，停權只有管理員
router.get('/customers', listCustomers)
router.get('/customers/:id', getCustomer)
router.put('/customers/:id/note', updateCustomerNote)
router.patch('/customers/:id/active', requireAdmin, setCustomerActive)

// 給代客預約選療程、美容師用
router.get('/services', listAdminServices)
router.get('/staff', listAdminStaff)
router.get('/staff/:id/schedule', getStaffSchedule)

// 管理員專用：療程、美容師排班
router.get('/categories', requireAdmin, listCategories)
router.post('/categories', requireAdmin, saveCategory)
router.put('/categories/:id', requireAdmin, saveCategory)
router.post('/services', requireAdmin, saveService)
router.put('/services/:id', requireAdmin, saveService)
router.patch('/services/:id/active', requireAdmin, setServiceActive)
router.post('/staff', requireAdmin, saveStaff)
router.put('/staff/:id', requireAdmin, saveStaff)
router.patch('/staff/:id/active', requireAdmin, setStaffActive)
router.put('/staff/:id/schedule', requireAdmin, saveStaffSchedule)
router.post('/staff/:id/leaves', requireAdmin, addStaffLeave)
router.delete('/leaves/:leaveId', requireAdmin, deleteStaffLeave)

// 管理員專用：行銷、營業設定、報表、紀錄
router.get('/coupons', requireAdmin, listCoupons)
router.post('/coupons', requireAdmin, saveCoupon)
router.put('/coupons/:id', requireAdmin, saveCoupon)
router.get('/announcements', requireAdmin, listAnnouncements)
router.post('/announcements', requireAdmin, saveAnnouncement)
router.put('/announcements/:id', requireAdmin, saveAnnouncement)
router.delete('/announcements/:id', requireAdmin, deleteAnnouncement)
router.get('/closures', requireAdmin, listClosures)
router.post('/closures', requireAdmin, addClosure)
router.delete('/closures/:date', requireAdmin, deleteClosure)
router.get('/reports', requireAdmin, getReports)
router.get('/logs', requireAdmin, listLogs)

// 管理員專用：帳號權限
router.get('/users', requireAdmin, listStaffUsers)
router.post('/users', requireAdmin, createStaffUser)
router.patch('/users/:id/role', requireAdmin, updateUserRole)
router.patch('/users/:id/deactivate', requireAdmin, deactivateStaffUser)

export default router
