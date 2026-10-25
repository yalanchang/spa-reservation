import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { query, execute, queryOne } from '../models/db'
import { logAction } from '../utils/adminLog'

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
const STATUS_TEXT: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
  no_show: '未到店'
}

// 依目前狀態與是否已過預約時間，決定可以改成哪些狀態
const allowedNextStatuses = (status: string, isPast: boolean): string[] => {
  switch (status) {
    case 'pending':
      return isPast ? ['completed', 'no_show', 'cancelled'] : ['confirmed', 'cancelled']
    case 'confirmed':
      return isPast ? ['completed', 'no_show'] : ['cancelled']
    case 'completed':
      return ['no_show']
    case 'no_show':
      return ['completed']
    default:
      return []
  }
}

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await queryOne<any>(
      `SELECT
         SUM(appointment_date = CURDATE() AND status NOT IN ('cancelled', 'no_show')) AS today,
         SUM(status = 'pending' AND TIMESTAMP(appointment_date, start_time) > NOW()) AS pending,
         SUM(status IN ('pending', 'confirmed') AND TIMESTAMP(appointment_date, start_time) <= NOW()) AS to_finish,
         SUM(appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 6 DAY)
             AND status NOT IN ('cancelled', 'no_show')) AS week
       FROM appointments`
    )

    const reviews = await queryOne<any>(
      `SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average,
              SUM(staff_reply IS NULL OR staff_reply = '') AS unreplied
       FROM reviews`
    )

    res.json({
      success: true,
      data: {
        today: Number(stats?.today || 0),
        pending: Number(stats?.pending || 0),
        toFinish: Number(stats?.to_finish || 0),
        week: Number(stats?.week || 0),
        reviewCount: Number(reviews?.count || 0),
        averageRating: reviews?.average ? Number(reviews.average) : null,
        unreplied: Number(reviews?.unreplied || 0)
      }
    })
  } catch (error) {
    console.error('Get admin stats error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

export const listAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, status, q, range, from, to, coupon, serviceId, staffId, hour, source } = req.query as Record<
      string,
      string | undefined
    >
    const where: string[] = []
    const params: any[] = []

    // 報表點進來看明細：指定日期區間
    const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
    if (isDay(from) && isDay(to)) {
      where.push('a.appointment_date BETWEEN ? AND ?')
      params.push(from, to)
    } else if (date) {
      where.push('a.appointment_date = ?')
      params.push(date)
    } else if (range === 'past') {
      where.push('TIMESTAMP(a.appointment_date, a.start_time) <= NOW()')
    } else if (range !== 'all') {
      where.push('TIMESTAMP(a.appointment_date, a.start_time) > NOW()')
    }

    // 待處理：已過時間但還沒標記完成或未到店
    if (status === 'to_finish') {
      where.push(`a.status IN ('pending', 'confirmed') AND TIMESTAMP(a.appointment_date, a.start_time) <= NOW()`)
    } else if (status && STATUSES.includes(status)) {
      where.push('a.status = ?')
      params.push(status)
    }

    if (coupon === '1') where.push('a.discount > 0')
    // 報表各排行點進來的條件
    if (serviceId) {
      where.push('a.service_id = ?')
      params.push(Number(serviceId))
    }
    if (staffId) {
      where.push('a.staff_id = ?')
      params.push(Number(staffId))
    }
    if (hour !== undefined && /^\d{1,2}$/.test(hour)) {
      where.push('HOUR(a.start_time) = ?')
      params.push(Number(hour))
    }
    if (source) {
      where.push('a.source = ?')
      params.push(source)
    }
    // 報表的每日長條：不含取消
    if (status === 'not_cancelled') where.push("a.status <> 'cancelled'")

    if (q?.trim()) {
      where.push('(a.customer_name LIKE ? OR a.customer_phone LIKE ? OR a.appointment_no LIKE ?)')
      const like = `%${q.trim()}%`
      params.push(like, like.replace(/[\s-]/g, ''), like)
    }

    const order = range === 'past' && !date ? 'DESC' : 'ASC'

    const appointments = await query(
      `SELECT a.id, a.appointment_no, a.appointment_date, a.start_time, a.end_time, a.duration,
              a.price, a.discount, a.status, a.source, a.customer_name, a.customer_phone, a.notes, a.created_at,
              s.name AS service_name, st.name AS staff_name,
              TIMESTAMP(a.appointment_date, a.start_time) <= NOW() AS is_past,
              r.rating AS review_rating,
              u.skin_type AS customer_skin_type, u.care_notes AS customer_care_notes
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN staff st ON a.staff_id = st.id
       LEFT JOIN reviews r ON r.appointment_id = a.id
       LEFT JOIN users u ON u.id = a.user_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY a.appointment_date ${order}, a.start_time ${order}
       LIMIT 500`,
      params
    )

    res.json({
      success: true,
      data: appointments.map((a: any) => ({
        ...a,
        next_statuses: allowedNextStatuses(a.status, !!Number(a.is_past))
      }))
    })
  } catch (error) {
    console.error('List admin appointments error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body

    const appointment = await queryOne<any>(
      `SELECT id, status, customer_name, appointment_date, start_time,
              TIMESTAMP(appointment_date, start_time) <= NOW() AS is_past
       FROM appointments WHERE id = ?`,
      [req.params.id]
    )

    if (!appointment) {
      res.status(404).json({
        success: false,
        message: '預約不存在'
      })
      return
    }

    if (!allowedNextStatuses(appointment.status, !!Number(appointment.is_past)).includes(status)) {
      res.status(400).json({
        success: false,
        message: '目前的預約狀態無法這樣變更'
      })
      return
    }

    // 確認或取消時通知顧客（顧客的鈴鐺會顯示），其他狀態不通知
    const notice = ['confirmed', 'cancelled'].includes(status) ? status : null
    await execute('UPDATE appointments SET status = ?, status_notice = ? WHERE id = ?', [
      status,
      notice,
      appointment.id
    ])
    await logAction(
      req,
      '變更預約狀態',
      appointment.customer_name,
      `${STATUS_TEXT[appointment.status]} → ${STATUS_TEXT[status]}`
    )

    res.json({
      success: true,
      message: '狀態已更新'
    })
  } catch (error) {
    console.error('Update appointment status error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

export const listReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const onlyUnreplied = req.query.unreplied === '1'

    const reviews = await query(
      `SELECT r.id, r.rating, r.comment, r.staff_reply, r.created_at,
              u.name AS user_name, s.name AS service_name, st.name AS staff_name,
              a.appointment_date, a.start_time
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN services s ON r.service_id = s.id
       JOIN staff st ON r.staff_id = st.id
       JOIN appointments a ON r.appointment_id = a.id
       ${onlyUnreplied ? "WHERE r.staff_reply IS NULL OR r.staff_reply = ''" : ''}
       ORDER BY r.created_at DESC
       LIMIT 200`
    )

    res.json({
      success: true,
      data: reviews
    })
  } catch (error) {
    console.error('List admin reviews error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

export const replyReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const reply = typeof req.body.reply === 'string' ? req.body.reply.trim() : ''

    if (reply.length > 500) {
      res.status(400).json({
        success: false,
        message: '回覆請在 500 字以內'
      })
      return
    }

    const review = await queryOne('SELECT id FROM reviews WHERE id = ?', [req.params.id])

    if (!review) {
      res.status(404).json({
        success: false,
        message: '心得不存在'
      })
      return
    }

    // 空白代表刪除回覆
    await execute('UPDATE reviews SET staff_reply = ? WHERE id = ?', [reply || null, req.params.id])
    await logAction(req, reply ? '回覆心得' : '刪除心得回覆', `#${req.params.id}`)

    res.json({
      success: true,
      message: reply ? '已回覆' : '已刪除回覆'
    })
  } catch (error) {
    console.error('Reply review error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

const STAFF_ROLES = ['admin', 'staff']

export const listStaffUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await query(
      `SELECT id, name, email, phone, role, created_at
       FROM users
       WHERE role IN ('admin', 'staff') AND is_active = 1
       ORDER BY FIELD(role, 'admin', 'staff'), created_at`
    )

    res.json({
      success: true,
      data: users
    })
  } catch (error) {
    console.error('List staff users error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

export const createStaffUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const { password, role } = req.body

    if (!name || !email) {
      res.status(400).json({ success: false, message: '請填寫姓名和電子郵件' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: '電子郵件格式不正確' })
      return
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, message: '初始密碼至少要 6 個字元' })
      return
    }
    if (!STAFF_ROLES.includes(role)) {
      res.status(400).json({ success: false, message: '角色不正確' })
      return
    }

    // 後台帳號與前台會員分開，同一個信箱不能兩邊共用
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      res.status(400).json({ success: false, message: '這個信箱已經有帳號了，請換一個' })
      return
    }

    const hashed = await bcrypt.hash(password, 12)
    // 初始密碼是管理員設定的，對方第一次登入時會被提醒更改
    await execute('INSERT INTO users (name, email, password, role, must_change_password) VALUES (?, ?, ?, ?, 1)', [
      name,
      email,
      hashed,
      role
    ])
    await logAction(req, '新增後台帳號', name, email)

    res.json({
      success: true,
      message: '帳號已建立'
    })
  } catch (error) {
    console.error('Create staff user error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

// 變更角色或停用帳號前的共同檢查：不能動自己、至少保留一位管理員
const checkStaffChange = async (req: Request, res: Response, nextRole: string | null) => {
  const targetId = Number(req.params.id)

  if (targetId === req.user?.userId) {
    res.status(400).json({ success: false, message: '不能變更自己的帳號' })
    return null
  }

  const user = await queryOne<any>(
    "SELECT id, role FROM users WHERE id = ? AND is_active = 1 AND role IN ('admin', 'staff')",
    [targetId]
  )
  if (!user) {
    res.status(404).json({ success: false, message: '帳號不存在' })
    return null
  }

  if (user.role === 'admin' && nextRole !== 'admin') {
    const admins = await queryOne<any>("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1")
    if (Number(admins?.count) <= 1) {
      res.status(400).json({ success: false, message: '至少要保留一位管理員' })
      return null
    }
  }

  return user
}

export const deactivateStaffUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await checkStaffChange(req, res, null)
    if (!user) return

    await execute('UPDATE users SET is_active = 0 WHERE id = ?', [user.id])
    await logAction(req, '停用後台帳號', `#${user.id}`)

    res.json({
      success: true,
      message: '帳號已停用'
    })
  } catch (error) {
    console.error('Deactivate staff user error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body

    if (!STAFF_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: '角色不正確'
      })
      return
    }

    const user = await checkStaffChange(req, res, role)
    if (!user) return

    await execute('UPDATE users SET role = ? WHERE id = ?', [role, user.id])
    await logAction(req, '變更後台權限', `#${user.id}`, role === 'admin' ? '管理員' : '美容師')

    res.json({
      success: true,
      message: '角色已更新'
    })
  } catch (error) {
    console.error('Update user role error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}
