import { Request, Response } from 'express'
import { query, execute, queryOne } from '../models/db'

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      serviceId,
      staffId,
      date,
      time,
      customerName,
      customerPhone,
      notes
    } = req.body

    const service = await queryOne(
      'SELECT duration, price FROM services WHERE id = ?',
      [serviceId]
    )

    if (!service) {
      res.status(404).json({ 
        success: false, 
        message: '服務不存在' 
      })
      return
    }

    const [hours, minutes] = time.split(':').map(Number)
    const endMinutes = minutes + service.duration
    const endHours = hours + Math.floor(endMinutes / 60)
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

    const existing = await queryOne(
      `SELECT id FROM appointments 
       WHERE staff_id = ? AND appointment_date = ? 
       AND start_time < ? AND end_time > ? 
       AND status NOT IN ('cancelled', 'no_show')`,
      [staffId, date, endTime, time]
    )

    if (existing) {
      res.status(400).json({ 
        success: false, 
        message: '此時段已被預約' 
      })
      return
    }

    const appointmentNo = 'APT' + Date.now()

    await execute(
      `INSERT INTO appointments 
       (appointment_no, service_id, staff_id, appointment_date, 
        start_time, end_time, duration, price, customer_name, 
        customer_phone, notes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentNo,
        serviceId,
        staffId,
        date,
        time,
        endTime,
        service.duration,
        service.price,
        customerName,
        customerPhone,
        notes,
        (req as any).user?.userId || null
      ]
    )

    res.json({
      success: true,
      message: '預約成功',
      data: { appointmentNo }
    })
  } catch (error) {
    console.error('Create appointment error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, serviceId } = req.query

    const availableSlots = [
      '09:00', '09:30', '10:00', '10:30',
      '11:00', '13:00', '13:30', '14:00',
      '14:30', '15:00', '15:30', '16:00'
    ]

    res.json({
      success: true,
      data: availableSlots
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
      `SELECT a.*, s.name as service_name, st.name as staff_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
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
