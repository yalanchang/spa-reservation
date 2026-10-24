import { Request, Response } from 'express'
import { query, execute, queryOne, withBookingLock } from '../models/db'
import { isValidTaiwanPhone, normalizeTaiwanPhone } from '../utils/phone'
import { getSlotStaff, findFreeStaff, getClosure, addMinutes, taipeiTime } from '../utils/availability'
import { applyCoupon, CouponError } from '../utils/coupon'

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      serviceId,
      staffId,
      date,
      time,
      customerName,
      customerPhone,
      notes,
      couponCode
    } = req.body

    if (!customerName?.trim()) {
      res.status(400).json({ success: false, message: '請填寫姓名' })
      return
    }

    if (!customerPhone || !isValidTaiwanPhone(customerPhone)) {
      res.status(400).json({ 
        success: false, 
        message: '電話格式不正確：手機為 09 開頭共 10 碼，市話請加區碼' 
      })
      return
    }

    if (!date || !time || taipeiTime(date, time) <= new Date()) {
      res.status(400).json({ 
        success: false, 
        message: '這個時段已經過了，請選擇其他時段' 
      })
      return
    }

    const service = await queryOne(
      'SELECT duration, price FROM services WHERE id = ? AND is_active = 1',
      [serviceId]
    )

    if (!service) {
      res.status(404).json({ 
        success: false, 
        message: '服務不存在' 
      })
      return
    }

    // 檢查空檔、優惠券到寫入要排隊進行，避免同時送出時重複預約或優惠券超用
    const appointmentNo = await withBookingLock(async () => {
      // 「任何美容師」由系統挑一位當時有空的
      const assignedStaff = await findFreeStaff({ date, time, duration: service.duration, staffId: staffId || null })
      if (!assignedStaff) return null

      const price = Number(service.price)
      const { coupon, discount } = await applyCoupon(couponCode, price, (req as any).user.userId)
      const no = 'APT' + Date.now()

      await execute(
        `INSERT INTO appointments 
         (appointment_no, service_id, staff_id, appointment_date, 
          start_time, end_time, duration, price, coupon_id, discount, customer_name, 
          customer_phone, notes, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          no,
          serviceId,
          assignedStaff,
          date,
          time,
          addMinutes(time, service.duration),
          service.duration,
          price - discount,
          coupon?.id || null,
          discount,
          customerName.trim(),
          normalizeTaiwanPhone(customerPhone),
          notes || null,
          (req as any).user?.userId || null
        ]
      )
      return no
    })

    if (!appointmentNo) {
      res.status(400).json({ 
        success: false, 
        message: '此時段已被預約，請選擇其他時段' 
      })
      return
    }

    res.json({
      success: true,
      message: '預約成功',
      data: { appointmentNo }
    })
  } catch (error) {
    if (error instanceof CouponError) {
      res.status(400).json({ success: false, message: error.message })
      return
    }
    console.error('Create appointment error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, serviceId, staffId, excludeId } = req.query as Record<string, string | undefined>
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.json({ success: true, data: [] })
      return
    }

    const closure = await getClosure(date)
    if (closure) {
      res.json({ success: true, data: [], message: `本店這天公休${closure.reason ? `（${closure.reason}）` : ''}` })
      return
    }

    const service = await queryOne<any>('SELECT duration FROM services WHERE id = ?', [serviceId])
    let duration = Number(service?.duration) || 60
    // 修改預約時：時長沿用原本的預約，並且不把自己算成占用
    let exclude: number | undefined
    if (excludeId && (req as any).user) {
      const own = await queryOne<any>('SELECT id, duration FROM appointments WHERE id = ? AND user_id = ?', [excludeId, (req as any).user.userId])
      if (own) { exclude = own.id; duration = own.duration }
    }

    const slots = await getSlotStaff({ date, duration, staffId: staffId ? Number(staffId) : null, excludeAppointmentId: exclude })
    res.json({
      success: true,
      data: [...slots.keys()],
      message: slots.size ? undefined : '這天已經約滿或美容師休假，請換一天'
    })
  } catch (error) {
    console.error('Get available slots error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const getUserAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    const appointments = await query(
      `SELECT a.*, s.name as service_name, st.name as staff_name,
              TIMESTAMP(a.appointment_date, a.start_time) <= NOW() AS is_past,
              r.rating AS review_rating, r.comment AS review_comment, r.staff_reply AS review_reply
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
       LEFT JOIN reviews r ON r.appointment_id = a.id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [(req as any).user.userId]
    )

    res.json({
      success: true,
      data: appointments
    })
  } catch (error) {
    console.error('Get user appointments error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    const appointment = await queryOne(
      `SELECT id, status, TIMESTAMP(appointment_date, start_time) <= NOW() AS is_past
       FROM appointments WHERE id = ? AND user_id = ?`,
      [req.params.id, (req as any).user.userId]
    )

    if (!appointment) {
      res.status(404).json({ 
        success: false, 
        message: '預約不存在' 
      })
      return
    }

    if (!['pending', 'confirmed'].includes(appointment.status) || appointment.is_past) {
      res.status(400).json({ 
        success: false, 
        message: '此預約無法取消' 
      })
      return
    }

    // 不直接刪除，改成「已取消」：店家看得到取消紀錄，報表與優惠券使用次數也正確
    await execute(
      "UPDATE appointments SET status = 'cancelled', status_notice = NULL WHERE id = ?",
      [appointment.id]
    )

    res.json({
      success: true,
      message: '預約已取消'
    })
  } catch (error) {
    console.error('Delete appointment error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    const { staffId, date, time, customerName, customerPhone, notes } = req.body

    const appointment = await queryOne(
      `SELECT id, status, duration, TIMESTAMP(appointment_date, start_time) <= NOW() AS is_past
       FROM appointments WHERE id = ? AND user_id = ?`,
      [req.params.id, (req as any).user.userId]
    )

    if (!appointment) {
      res.status(404).json({ 
        success: false, 
        message: '預約不存在' 
      })
      return
    }

    if (!['pending', 'confirmed'].includes(appointment.status) || appointment.is_past) {
      res.status(400).json({ 
        success: false, 
        message: '此預約無法修改' 
      })
      return
    }

    if (!staffId || !date || !time) {
      res.status(400).json({ 
        success: false, 
        message: '請選擇美容師、日期和時段' 
      })
      return
    }

    if (!customerName?.trim()) {
      res.status(400).json({ 
        success: false, 
        message: '請填寫姓名' 
      })
      return
    }

    if (!customerPhone || !isValidTaiwanPhone(customerPhone)) {
      res.status(400).json({ 
        success: false, 
        message: '電話格式不正確：手機為 09 開頭共 10 碼，市話請加區碼' 
      })
      return
    }

    if (taipeiTime(date, time) <= new Date()) {
      res.status(400).json({ 
        success: false, 
        message: '這個時段已經過了，請選擇其他時段' 
      })
      return
    }

    const endTime = addMinutes(time, appointment.duration)

    // 檢查空檔到更新要排隊進行，避免跟別人同時搶到同一個時段
    const updated = await withBookingLock(async () => {
      const free = await findFreeStaff({
        date, time, duration: appointment.duration, staffId: Number(staffId), excludeAppointmentId: appointment.id
      })
      if (!free) return false

      // status 放第一個：MySQL 依序更新欄位，這裡比較的還是修改前的日期、時段、美容師
      // 已確認的預約改了時間或美容師，要重新確認
      await execute(
        `UPDATE appointments SET
           status = IF(appointment_date <> ? OR start_time <> ? OR staff_id <> ?, 'pending', status),
           staff_id = ?, appointment_date = ?, start_time = ?, end_time = ?,
           customer_name = ?, customer_phone = ?, notes = ?, status_notice = NULL
         WHERE id = ?`,
        [
          date, time, staffId,
          staffId, date, time, endTime,
          customerName.trim(),
          normalizeTaiwanPhone(customerPhone),
          notes || null,
          appointment.id
        ]
      )
      return true
    })

    if (!updated) {
      res.status(400).json({ 
        success: false, 
        message: '此時段已被預約，請選擇其他時段' 
      })
      return
    }

    res.json({
      success: true,
      message: '預約已更新'
    })
  } catch (error) {
    console.error('Update appointment error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const markNoticesRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    await execute(
      'UPDATE appointments SET status_notice = NULL WHERE user_id = ? AND status_notice IS NOT NULL',
      [(req as any).user.userId]
    )

    res.json({
      success: true,
      message: '已讀取'
    })
  } catch (error) {
    console.error('Mark notices read error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

// 預約前先試算優惠碼
export const checkCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const service = await queryOne<any>('SELECT price FROM services WHERE id = ? AND is_active = 1', [req.body.serviceId])
    if (!service) {
      res.status(404).json({ success: false, message: '服務不存在' })
      return
    }
    const { coupon, discount } = await applyCoupon(req.body.code, Number(service.price), (req as any).user.userId)
    if (!coupon) {
      res.status(400).json({ success: false, message: '請輸入優惠碼' })
      return
    }
    res.json({ success: true, data: { code: coupon.code, name: coupon.name, discount } })
  } catch (error) {
    if (error instanceof CouponError) {
      res.status(400).json({ success: false, message: error.message })
      return
    }
    console.error('Check coupon error:', error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}
