// 後台：會員、代客預約、匯出、行銷（優惠碼、公告）、公休日、報表、操作紀錄
import { Request, Response } from 'express'
import { query, queryOne, execute, withBookingLock } from '../models/db'
import { fail, serverError, text, isDate, isTime, formatDate } from '../utils/http'
import { logAction } from '../utils/adminLog'
import { optionalSortOrder } from '../utils/sortOrder'
import { isValidTaiwanPhone, normalizeTaiwanPhone } from '../utils/phone'
import { getSlotStaff, findFreeStaff, addMinutes } from '../utils/availability'
import { AUDIENCES } from '../utils/coupon'

// ---------- 會員 ----------

const CUSTOMER_SORTS: Record<string, string> = {
  recent: 'u.created_at DESC',
  spend: 'total_spend DESC',
  visits: 'visit_count DESC',
  last: 'last_visit IS NULL, last_visit DESC'
}

export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = text(req.query.q)
    const sort = CUSTOMER_SORTS[String(req.query.sort)] || CUSTOMER_SORTS.recent
    const params: any[] = []
    let where = "u.role = 'customer'"
    if (q) {
      where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'
      params.push(`%${q}%`, `%${q}%`, `%${q.replace(/[\s-]/g, '')}%`)
    }
    // 報表「新會員」點進來：指定加入日期區間
    if (isDate(req.query.from) && isDate(req.query.to)) {
      where += ' AND DATE(u.created_at) BETWEEN ? AND ?'
      params.push(req.query.from, req.query.to)
    }
    if (req.query.status === 'inactive') where += ' AND u.is_active = 0'
    else if (req.query.status !== 'all') where += ' AND u.is_active = 1'

    const customers = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.created_at, u.marketing_opt_in,
              COALESCE(SUM(a.status = 'completed'), 0) AS visit_count,
              COALESCE(SUM(IF(a.status = 'completed', a.price, 0)), 0) AS total_spend,
              COALESCE(SUM(a.status = 'no_show'), 0) AS no_show_count,
              MAX(IF(a.status = 'completed', a.appointment_date, NULL)) AS last_visit
       FROM users u
       LEFT JOIN appointments a ON a.user_id = u.id
       WHERE ${where}
       GROUP BY u.id
       ORDER BY ${sort}
       LIMIT 300`,
      params
    )
    res.json({
      success: true,
      data: customers.map((c: any) => ({ ...c, last_visit: formatDate(c.last_visit) }))
    })
  } catch (error) {
    serverError(res, 'List customers error', error)
  }
}

export const getCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await queryOne<any>(
      `SELECT u.id, u.name, u.email, u.phone, u.birthday, u.gender, u.city, u.skin_type, u.care_notes,
              u.admin_note, u.is_active, u.created_at, u.marketing_opt_in, st.name AS preferred_staff
       FROM users u LEFT JOIN staff st ON st.id = u.preferred_staff_id
       WHERE u.id = ? AND u.role = 'customer'`,
      [req.params.id]
    )
    if (!customer) return fail(res, 404, '會員不存在')

    const appointments = await query<any>(
      `SELECT a.id, a.appointment_date, a.start_time, a.status, a.price, s.name AS service_name, st.name AS staff_name,
              r.rating
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN staff st ON st.id = a.staff_id
       LEFT JOIN reviews r ON r.appointment_id = a.id
       WHERE a.user_id = ?
       ORDER BY a.appointment_date DESC, a.start_time DESC
       LIMIT 100`,
      [customer.id]
    )
    res.json({
      success: true,
      data: {
        ...customer,
        birthday: formatDate(customer.birthday),
        appointments: appointments.map((a) => ({ ...a, appointment_date: formatDate(a.appointment_date) }))
      }
    })
  } catch (error) {
    serverError(res, 'Get customer error', error)
  }
}

export const updateCustomerNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const note = text(req.body.note)
    if (note.length > 1000) return fail(res, 400, '備註請在 1000 字以內')
    const customer = await queryOne<any>("SELECT name FROM users WHERE id = ? AND role = 'customer'", [req.params.id])
    if (!customer) return fail(res, 404, '會員不存在')
    await execute('UPDATE users SET admin_note = ? WHERE id = ?', [note || null, req.params.id])
    await logAction(req, '修改會員備註', customer.name)
    res.json({ success: true, message: '備註已儲存' })
  } catch (error) {
    serverError(res, 'Update customer note error', error)
  }
}

export const setCustomerActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const active = !!req.body.active
    const customer = await queryOne<any>("SELECT name FROM users WHERE id = ? AND role = 'customer'", [req.params.id])
    if (!customer) return fail(res, 404, '會員不存在')
    await execute('UPDATE users SET is_active = ? WHERE id = ?', [active ? 1 : 0, req.params.id])
    await logAction(req, active ? '恢復會員' : '停權會員', customer.name)
    res.json({ success: true, message: active ? '已恢復，對方可以重新登入' : '已停權，對方將無法登入' })
  } catch (error) {
    serverError(res, 'Set customer active error', error)
  }
}

// ---------- 代客預約 ----------

export const getAdminSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, serviceId, staffId } = req.query as Record<string, string | undefined>
    if (!isDate(date)) return void res.json({ success: true, data: [] })
    const service = await queryOne<any>('SELECT duration FROM services WHERE id = ?', [serviceId])
    if (!service) return void res.json({ success: true, data: [] })
    const slots = await getSlotStaff({ date, duration: service.duration, staffId: staffId ? Number(staffId) : null })
    res.json({ success: true, data: [...slots.keys()] })
  } catch (error) {
    serverError(res, 'Get admin slots error', error)
  }
}

const SOURCES = ['phone', 'walk_in', 'line', 'online']

export const createAdminAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId, staffId, date, time, source } = req.body
    const customerName = text(req.body.customerName)
    const customerPhone = text(req.body.customerPhone)
    const notes = text(req.body.notes)

    if (!customerName) return fail(res, 400, '請填寫顧客姓名')
    if (!isValidTaiwanPhone(customerPhone)) return fail(res, 400, '電話格式不正確')
    if (!isDate(date) || !isTime(time)) return fail(res, 400, '請選擇日期與時段')
    if (!SOURCES.includes(source)) return fail(res, 400, '請選擇預約管道')

    const service = await queryOne<any>('SELECT name, duration, price FROM services WHERE id = ? AND is_active = 1', [
      serviceId
    ])
    if (!service) return fail(res, 400, '請選擇療程')

    // 電話對得到會員就自動連結，顧客登入後也看得到這筆預約
    const phone = normalizeTaiwanPhone(customerPhone)
    const member = await queryOne<any>("SELECT id FROM users WHERE phone = ? AND role = 'customer' AND is_active = 1", [
      phone
    ])

    // 檢查空檔到寫入要排隊，避免跟前台同時搶到同一個時段
    const assigned = await withBookingLock(async () => {
      const staff = await findFreeStaff({ date, time, duration: service.duration, staffId: staffId || null })
      if (!staff) return null
      await execute(
        `INSERT INTO appointments
         (appointment_no, user_id, staff_id, service_id, customer_name, customer_phone, appointment_date,
          start_time, end_time, duration, price, status, source, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
        [
          'APT' + Date.now(),
          member?.id || null,
          staff,
          serviceId,
          customerName,
          phone,
          date,
          time,
          addMinutes(time, service.duration),
          service.duration,
          service.price,
          source,
          notes || null
        ]
      )
      return staff
    })
    if (!assigned) return fail(res, 400, '此時段已無空檔，請改選其他時段')

    await logAction(req, '代客預約', customerName, `${date} ${time.slice(0, 5)} ${service.name}`)
    res.json({ success: true, message: member ? '預約已建立，並已歸入該會員的預約紀錄' : '預約已建立' })
  } catch (error) {
    serverError(res, 'Create admin appointment error', error)
  }
}

// ---------- 匯出 ----------

const STATUS_TEXT: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  completed: '已完成',
  cancelled: '已取消',
  no_show: '未到店'
}
const SOURCE_TEXT: Record<string, string> = {
  online: '線上預約',
  phone: '電話預約',
  walk_in: '現場預約',
  line: 'LINE 預約'
}

const csvCell = (value: unknown) => {
  const s = value === null || value === undefined ? '' : String(value)
  // 開頭是公式符號的加上 '，避免用 Excel 開啟時被當成公式執行
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const exportAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query
    if (!isDate(from) || !isDate(to) || from > to) return fail(res, 400, '請選擇正確的日期區間')

    const rows = await query<any>(
      `SELECT a.appointment_no, a.appointment_date, a.start_time, a.end_time, a.customer_name, a.customer_phone,
              s.name AS service_name, st.name AS staff_name, a.price, a.discount, a.status, a.source, a.notes, a.created_at
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       JOIN staff st ON st.id = a.staff_id
       WHERE a.appointment_date BETWEEN ? AND ?
       ORDER BY a.appointment_date, a.start_time`,
      [from, to]
    )
    const header = [
      '預約編號',
      '日期',
      '開始',
      '結束',
      '顧客',
      '電話',
      '療程',
      '美容師',
      '金額',
      '折扣',
      '狀態',
      '來源',
      '備註',
      '建立時間'
    ]
    const lines = rows.map((r) =>
      [
        r.appointment_no,
        formatDate(r.appointment_date),
        String(r.start_time).slice(0, 5),
        String(r.end_time).slice(0, 5),
        r.customer_name,
        r.customer_phone,
        r.service_name,
        r.staff_name,
        Number(r.price),
        Number(r.discount),
        STATUS_TEXT[r.status] || r.status,
        SOURCE_TEXT[r.source] || r.source,
        r.notes,
        new Date(r.created_at).toLocaleString('zh-TW', { hour12: false, timeZone: 'Asia/Taipei' })
      ]
        .map(csvCell)
        .join(',')
    )

    await logAction(req, '匯出預約', `${from} ~ ${to}`, `${rows.length} 筆`)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="appointments-${from}-${to}.csv"`)
    // 加 BOM，Excel 開啟中文才不會亂碼
    res.send('﻿' + [header.join(','), ...lines].join('\r\n'))
  } catch (error) {
    serverError(res, 'Export appointments error', error)
  }
}

// ---------- 優惠碼 ----------

export const listCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await query<any>(
      `SELECT c.*,
              (SELECT COUNT(*) FROM appointments a WHERE a.coupon_id = c.id AND a.status <> 'cancelled') AS used_count,
              (SELECT COUNT(*) FROM user_coupons uc WHERE uc.coupon_id = c.id) AS claimed_count,
              (SELECT COALESCE(SUM(a.discount), 0) FROM appointments a WHERE a.coupon_id = c.id AND a.status = 'completed') AS total_discount
       FROM coupons c ORDER BY c.is_active DESC, c.created_at DESC`
    )
    res.json({
      success: true,
      data: coupons.map((c) => ({ ...c, start_date: formatDate(c.start_date), end_date: formatDate(c.end_date) }))
    })
  } catch (error) {
    serverError(res, 'List coupons error', error)
  }
}

export const saveCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = text(req.body.code).toUpperCase()
    const name = text(req.body.name)
    const description = text(req.body.description)
    const audience = AUDIENCES[req.body.audience] ? req.body.audience : 'all'
    const isClaimable = req.body.isClaimable === false ? 0 : 1
    const perUserLimit = Number(req.body.perUserLimit) || 1
    const type = req.body.discountType === 'percent' ? 'percent' : 'amount'
    const value = Number(req.body.discountValue)
    const minSpend = Number(req.body.minSpend) || 0
    const startDate = req.body.startDate || null
    const endDate = req.body.endDate || null
    const usageLimit =
      req.body.usageLimit === '' || req.body.usageLimit === null || req.body.usageLimit === undefined
        ? null
        : Number(req.body.usageLimit)

    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return fail(res, 400, '優惠碼請用 3–30 個英數字')
    if (!name || name.length > 100) return fail(res, 400, '請填寫活動名稱')
    if (!Number.isInteger(value) || value <= 0 || (type === 'percent' && value >= 100)) {
      return fail(res, 400, type === 'percent' ? '折扣百分比請填 1–99' : '折抵金額請填正整數')
    }
    if (!Number.isInteger(minSpend) || minSpend < 0) return fail(res, 400, '最低消費請填 0 以上的整數')
    if (
      (startDate && !isDate(startDate)) ||
      (endDate && !isDate(endDate)) ||
      (startDate && endDate && startDate > endDate)
    ) {
      return fail(res, 400, '活動期間不正確')
    }
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1))
      return fail(res, 400, '總使用次數上限請填正整數，或留空代表不限')
    if (!Number.isInteger(perUserLimit) || perUserLimit < 1 || perUserLimit > 99)
      return fail(res, 400, '每人限用次數請填 1–99')
    if (description.length > 200) return fail(res, 400, '說明請在 200 字以內')

    const duplicate = await queryOne<any>('SELECT id FROM coupons WHERE code = ? AND id <> ?', [
      code,
      req.params.id || 0
    ])
    if (duplicate) return fail(res, 400, '這個優惠碼已經存在')

    const values = [
      code,
      name,
      description || null,
      type,
      value,
      minSpend,
      startDate,
      endDate,
      usageLimit,
      audience,
      isClaimable,
      perUserLimit
    ]
    if (req.params.id) {
      const [result] = await execute(
        `UPDATE coupons SET code = ?, name = ?, description = ?, discount_type = ?, discount_value = ?, min_spend = ?,
         start_date = ?, end_date = ?, usage_limit = ?, audience = ?, is_claimable = ?, per_user_limit = ?, is_active = ?
         WHERE id = ?`,
        [...values, req.body.isActive === false ? 0 : 1, req.params.id]
      )
      if (!result.affectedRows) return fail(res, 404, '優惠碼不存在')
      await logAction(req, '修改優惠碼', code)
    } else {
      await execute(
        `INSERT INTO coupons (code, name, description, discount_type, discount_value, min_spend, start_date, end_date,
           usage_limit, audience, is_claimable, per_user_limit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      )
      await logAction(req, '新增優惠碼', code, name)
    }
    res.json({ success: true, message: '優惠碼已儲存' })
  } catch (error) {
    serverError(res, 'Save coupon error', error)
  }
}

// ---------- 跑馬燈公告 ----------

export const listAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<any>('SELECT * FROM announcements ORDER BY sort_order, id')
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, start_date: formatDate(r.start_date), end_date: formatDate(r.end_date) }))
    })
  } catch (error) {
    serverError(res, 'List announcements error', error)
  }
}

export const saveAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = text(req.body.content)
    const startDate = req.body.startDate || null
    const endDate = req.body.endDate || null
    const sortOrder = optionalSortOrder(req.body.sortOrder)
    if (!content || content.length > 40) return fail(res, 400, '公告內容請在 40 字以內，跑馬燈才放得下')
    if (
      (startDate && !isDate(startDate)) ||
      (endDate && !isDate(endDate)) ||
      (startDate && endDate && startDate > endDate)
    ) {
      return fail(res, 400, '顯示期間不正確')
    }
    const values = [content, startDate, endDate, sortOrder, req.body.isActive === false ? 0 : 1]
    if (req.params.id) {
      const [result] = await execute(
        'UPDATE announcements SET content = ?, start_date = ?, end_date = ?, sort_order = COALESCE(?, sort_order), is_active = ? WHERE id = ?',
        [...values, req.params.id]
      )
      if (!result.affectedRows) return fail(res, 404, '公告不存在')
      await logAction(req, '修改公告', content)
    } else {
      await execute(
        `INSERT INTO announcements (content, start_date, end_date, sort_order, is_active)
         SELECT ?, ?, ?, COALESCE(?, MAX(sort_order) + 1, 1), ? FROM announcements`,
        values
      )
      await logAction(req, '新增公告', content)
    }
    res.json({ success: true, message: '公告已儲存' })
  } catch (error) {
    serverError(res, 'Save announcement error', error)
  }
}

export const deleteAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await queryOne<any>('SELECT content FROM announcements WHERE id = ?', [req.params.id])
    if (!row) return fail(res, 404, '公告不存在')
    await execute('DELETE FROM announcements WHERE id = ?', [req.params.id])
    await logAction(req, '刪除公告', row.content)
    res.json({ success: true, message: '已刪除' })
  } catch (error) {
    serverError(res, 'Delete announcement error', error)
  }
}

// ---------- 公休日 ----------

export const listClosures = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<any>(
      `SELECT c.closure_date, c.reason,
              (SELECT COUNT(*) FROM appointments a WHERE a.appointment_date = c.closure_date
               AND a.status IN ('pending', 'confirmed')) AS appointment_count
       FROM store_closures c WHERE c.closure_date >= CURDATE() ORDER BY c.closure_date`
    )
    res.json({ success: true, data: rows.map((r) => ({ ...r, closure_date: formatDate(r.closure_date) })) })
  } catch (error) {
    serverError(res, 'List closures error', error)
  }
}

export const addClosure = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.body
    const reason = text(req.body.reason)
    if (!isDate(date)) return fail(res, 400, '請選擇日期')
    if (reason.length > 100) return fail(res, 400, '原因請在 100 字以內')
    await execute(
      'INSERT INTO store_closures (closure_date, reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE reason = VALUES(reason)',
      [date, reason || null]
    )
    const booked = await queryOne<any>(
      "SELECT COUNT(*) AS count FROM appointments WHERE appointment_date = ? AND status IN ('pending', 'confirmed')",
      [date]
    )
    await logAction(req, '新增公休日', date, reason)
    res.json({
      success: true,
      message: Number(booked?.count)
        ? `已設定公休，但這天還有 ${booked.count} 筆預約，記得聯絡顧客改期`
        : '已設定公休，前台這天不能預約'
    })
  } catch (error) {
    serverError(res, 'Add closure error', error)
  }
}

export const deleteClosure = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDate(req.params.date)) return fail(res, 400, '日期不正確')
    await execute('DELETE FROM store_closures WHERE closure_date = ?', [req.params.date])
    await logAction(req, '取消公休日', req.params.date)
    res.json({ success: true, message: '已取消公休' })
  } catch (error) {
    serverError(res, 'Delete closure error', error)
  }
}

// ---------- 營運報表 ----------

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query
    if (!isDate(from) || !isDate(to) || from > to) return fail(res, 400, '請選擇正確的日期區間')
    const range = [from, to]

    const summary = await queryOne<any>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'completed'), 0) AS completed,
              COALESCE(SUM(status = 'cancelled'), 0) AS cancelled,
              COALESCE(SUM(status = 'no_show'), 0) AS no_show,
              COALESCE(SUM(IF(status = 'completed', price, 0)), 0) AS revenue,
              COALESCE(SUM(IF(status = 'completed', discount, 0)), 0) AS discount,
              COUNT(DISTINCT IF(status = 'completed', COALESCE(user_id, customer_phone), NULL)) AS customers
       FROM appointments WHERE appointment_date BETWEEN ? AND ?`,
      range
    )
    const newMembers = await queryOne<any>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'customer' AND DATE(created_at) BETWEEN ? AND ?",
      range
    )
    const byService = await query(
      `SELECT s.id, s.name, COUNT(*) AS count, COALESCE(SUM(a.price), 0) AS revenue
       FROM appointments a JOIN services s ON s.id = a.service_id
       WHERE a.status = 'completed' AND a.appointment_date BETWEEN ? AND ?
       GROUP BY s.id ORDER BY revenue DESC`,
      range
    )
    const byStaff = await query(
      `SELECT st.id, st.name, COUNT(*) AS count, COALESCE(SUM(a.price), 0) AS revenue,
              (SELECT ROUND(AVG(r.rating), 1) FROM reviews r JOIN appointments ra ON ra.id = r.appointment_id
               WHERE r.staff_id = st.id AND ra.appointment_date BETWEEN ? AND ?) AS rating
       FROM appointments a JOIN staff st ON st.id = a.staff_id
       WHERE a.status = 'completed' AND a.appointment_date BETWEEN ? AND ?
       GROUP BY st.id ORDER BY revenue DESC`,
      [...range, ...range]
    )
    const bySource = await query(
      `SELECT source, COUNT(*) AS count FROM appointments
       WHERE appointment_date BETWEEN ? AND ? GROUP BY source ORDER BY count DESC`,
      range
    )
    const byDay = await query<any>(
      `SELECT appointment_date AS date, COUNT(*) AS count, COALESCE(SUM(IF(status = 'completed', price, 0)), 0) AS revenue
       FROM appointments WHERE appointment_date BETWEEN ? AND ? AND status <> 'cancelled'
       GROUP BY appointment_date ORDER BY appointment_date`,
      range
    )
    const byHour = await query(
      `SELECT HOUR(start_time) AS hour, COUNT(*) AS count FROM appointments
       WHERE appointment_date BETWEEN ? AND ? AND status <> 'cancelled'
       GROUP BY HOUR(start_time) ORDER BY hour`,
      range
    )

    res.json({
      success: true,
      data: {
        summary: { ...summary, new_members: Number(newMembers?.count || 0) },
        byService,
        byStaff,
        bySource,
        byDay: byDay.map((d) => ({ ...d, date: formatDate(d.date) })),
        byHour
      }
    })
  } catch (error) {
    serverError(res, 'Get reports error', error)
  }
}

// ---------- 操作紀錄 ----------

export const listLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = text(req.query.q)
    const params: any[] = []
    let where = ''
    if (q) {
      where = 'WHERE l.action LIKE ? OR l.target LIKE ? OR u.name LIKE ?'
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }
    const logs = await query(
      `SELECT l.id, l.action, l.target, l.detail, l.created_at, u.name AS user_name
       FROM admin_logs l LEFT JOIN users u ON u.id = l.user_id
       ${where}
       ORDER BY l.id DESC LIMIT 300`,
      params
    )
    res.json({ success: true, data: logs })
  } catch (error) {
    serverError(res, 'List logs error', error)
  }
}
