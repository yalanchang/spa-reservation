import { Request, Response } from 'express'
import { query, execute, queryOne } from '../models/db'

export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ success: false, message: '未授權' })
      return
    }

    const { appointmentId, rating, comment } = req.body

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ 
        success: false, 
        message: '請選擇 1 到 5 顆星' 
      })
      return
    }

    const text = typeof comment === 'string' ? comment.trim() : ''
    if (text.length < 5 || text.length > 500) {
      res.status(400).json({ 
        success: false, 
        message: '心得請寫 5 到 500 個字' 
      })
      return
    }

    const appointment = await queryOne(
      `SELECT id, staff_id, service_id, status,
              TIMESTAMP(appointment_date, start_time) <= NOW() AS is_past
       FROM appointments WHERE id = ? AND user_id = ?`,
      [appointmentId, (req as any).user.userId]
    )

    if (!appointment) {
      res.status(404).json({ 
        success: false, 
        message: '預約不存在' 
      })
      return
    }

    // 店家標記「已完成」才算真的體驗過，避免沒到店的人留評價
    if (appointment.status !== 'completed') {
      res.status(400).json({ 
        success: false, 
        message: '療程完成後才能撰寫心得' 
      })
      return
    }

    const existing = await queryOne(
      'SELECT id FROM reviews WHERE appointment_id = ?',
      [appointment.id]
    )

    if (existing) {
      res.status(400).json({ 
        success: false, 
        message: '這筆預約已經寫過心得了' 
      })
      return
    }

    await execute(
      `INSERT INTO reviews (appointment_id, user_id, staff_id, service_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [appointment.id, (req as any).user.userId, appointment.staff_id, appointment.service_id, rating, text]
    )

    res.json({
      success: true,
      message: '感謝你的心得'
    })
  } catch (error) {
    console.error('Create review error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const getServiceReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    // 公開顯示時姓名只留第一個字
    const reviews = await query(
      `SELECT r.id, r.rating, r.comment, r.staff_reply, r.created_at,
              CONCAT(LEFT(u.name, 1), '**') AS user_name,
              st.name AS staff_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN staff st ON r.staff_id = st.id
       WHERE r.service_id = ?
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.params.serviceId]
    )

    const summary = await queryOne(
      'SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average FROM reviews WHERE service_id = ?',
      [req.params.serviceId]
    )

    res.json({
      success: true,
      data: {
        reviews,
        count: Number(summary?.count || 0),
        average: summary?.average ? Number(summary.average) : null
      }
    })
  } catch (error) {
    console.error('Get service reviews error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}
