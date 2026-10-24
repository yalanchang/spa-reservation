// 後台：服務項目、分類、美容師與排班
import { Request, Response } from 'express'
import { query, queryOne, execute } from '../models/db'
import { fail, serverError, text, isDate, isTime, formatDate } from '../utils/http'
import { logAction } from '../utils/adminLog'

// ---------- 分類 ----------

export const listCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await query(
      `SELECT c.id, c.name, c.description, c.sort_order, c.is_active, COUNT(s.id) AS service_count
       FROM service_categories c
       LEFT JOIN services s ON s.category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order, c.id`
    )
    res.json({ success: true, data: categories })
  } catch (error) {
    serverError(res, 'List categories error', error)
  }
}

export const saveCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = text(req.body.name)
    const description = text(req.body.description)
    const sortOrder = Number(req.body.sortOrder) || 0
    if (!name || name.length > 100) return fail(res, 400, '請填寫分類名稱（100 字以內）')

    if (req.params.id) {
      const [result] = await execute(
        'UPDATE service_categories SET name = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?',
        [name, description || null, sortOrder, req.body.isActive === false ? 0 : 1, req.params.id]
      )
      if (!result.affectedRows) return fail(res, 404, '分類不存在')
      await logAction(req, '修改分類', name)
    } else {
      await execute(
        'INSERT INTO service_categories (name, description, sort_order) VALUES (?, ?, ?)',
        [name, description || null, sortOrder]
      )
      await logAction(req, '新增分類', name)
    }
    res.json({ success: true, message: '分類已儲存' })
  } catch (error) {
    serverError(res, 'Save category error', error)
  }
}

// ---------- 服務項目 ----------

export const listAdminServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const services = await query(
      `SELECT s.id, s.category_id, s.name, s.description, s.price, s.duration, s.sort_order, s.is_active,
              c.name AS category_name,
              (SELECT COUNT(*) FROM appointments a WHERE a.service_id = s.id AND a.status = 'completed') AS completed_count,
              (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.service_id = s.id) AS average_rating
       FROM services s
       JOIN service_categories c ON c.id = s.category_id
       ORDER BY c.sort_order, s.sort_order, s.id`
    )
    res.json({ success: true, data: services })
  } catch (error) {
    serverError(res, 'List admin services error', error)
  }
}

export const saveService = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = text(req.body.name)
    const description = text(req.body.description)
    const price = Number(req.body.price)
    const duration = Number(req.body.duration)
    const categoryId = Number(req.body.categoryId)
    const sortOrder = Number(req.body.sortOrder) || 0

    if (!name || name.length > 200) return fail(res, 400, '請填寫療程名稱（200 字以內）')
    if (!Number.isInteger(price) || price < 0 || price > 1000000) return fail(res, 400, '價格請填 0 以上的整數')
    if (!Number.isInteger(duration) || duration < 15 || duration > 480 || duration % 15) {
      return fail(res, 400, '時長請填 15 到 480 分鐘，以 15 分鐘為單位')
    }
    if (!(await queryOne('SELECT id FROM service_categories WHERE id = ?', [categoryId]))) {
      return fail(res, 400, '請選擇分類')
    }

    if (req.params.id) {
      const [result] = await execute(
        `UPDATE services SET category_id = ?, name = ?, description = ?, price = ?, duration = ?, sort_order = ?
         WHERE id = ?`,
        [categoryId, name, description || null, price, duration, sortOrder, req.params.id]
      )
      if (!result.affectedRows) return fail(res, 404, '療程不存在')
      await logAction(req, '修改療程', name, `NT$ ${price}，${duration} 分鐘`)
    } else {
      await execute(
        `INSERT INTO services (category_id, name, description, price, duration, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [categoryId, name, description || null, price, duration, sortOrder]
      )
      await logAction(req, '新增療程', name, `NT$ ${price}，${duration} 分鐘`)
    }
    res.json({ success: true, message: '療程已儲存' })
  } catch (error) {
    serverError(res, 'Save service error', error)
  }
}

export const setServiceActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const active = !!req.body.active
    const service = await queryOne<any>('SELECT name FROM services WHERE id = ?', [req.params.id])
    if (!service) return fail(res, 404, '療程不存在')
    await execute('UPDATE services SET is_active = ? WHERE id = ?', [active ? 1 : 0, req.params.id])
    await logAction(req, active ? '上架療程' : '下架療程', service.name)
    res.json({ success: true, message: active ? '已上架' : '已下架，前台不會再顯示' })
  } catch (error) {
    serverError(res, 'Set service active error', error)
  }
}

// ---------- 美容師 ----------

export const listAdminStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await query(
      `SELECT st.id, st.name, st.title, st.bio, st.years_experience, st.is_active,
              (SELECT GROUP_CONCAT(day_of_week ORDER BY day_of_week) FROM staff_schedule ss
               WHERE ss.staff_id = st.id AND ss.is_working = 1) AS working_days,
              (SELECT COUNT(*) FROM appointments a WHERE a.staff_id = st.id AND a.appointment_date = CURDATE()
               AND a.status NOT IN ('cancelled', 'no_show')) AS today_count,
              (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.staff_id = st.id) AS average_rating
       FROM staff st
       ORDER BY st.is_active DESC, st.id`
    )
    res.json({
      success: true,
      data: staff.map((s: any) => ({
        ...s,
        working_days: s.working_days ? String(s.working_days).split(',').map(Number) : []
      }))
    })
  } catch (error) {
    serverError(res, 'List admin staff error', error)
  }
}

export const saveStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const name = text(req.body.name)
    const title = text(req.body.title)
    const bio = text(req.body.bio)
    const years = Number(req.body.yearsExperience) || 0
    if (!name || name.length > 100) return fail(res, 400, '請填寫姓名（100 字以內）')
    if (years < 0 || years > 60) return fail(res, 400, '年資請填 0 到 60')

    if (req.params.id) {
      const [result] = await execute(
        'UPDATE staff SET name = ?, title = ?, bio = ?, years_experience = ? WHERE id = ?',
        [name, title || null, bio || null, years, req.params.id]
      )
      if (!result.affectedRows) return fail(res, 404, '美容師不存在')
      await logAction(req, '修改美容師資料', name)
    } else {
      const [result] = await execute(
        'INSERT INTO staff (name, title, bio, years_experience) VALUES (?, ?, ?, ?)',
        [name, title || null, bio || null, years]
      )
      // 新人先帶入預設班表，之後再調整
      await execute(
        `INSERT INTO staff_schedule (staff_id, day_of_week, start_time, end_time, is_working)
         VALUES ${Array.from({ length: 7 }, () => '(?, ?, ?, ?, ?)').join(', ')}`,
        Array.from({ length: 7 }, (_, day) => [result.insertId, day, '10:00', day === 0 || day === 6 ? '18:00' : '20:00', day === 1 ? 0 : 1]).flat()
      )
      await logAction(req, '新增美容師', name)
    }
    res.json({ success: true, message: '已儲存' })
  } catch (error) {
    serverError(res, 'Save staff error', error)
  }
}

export const setStaffActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const active = !!req.body.active
    const staff = await queryOne<any>('SELECT name FROM staff WHERE id = ?', [req.params.id])
    if (!staff) return fail(res, 404, '美容師不存在')

    if (!active) {
      const upcoming = await queryOne<any>(
        `SELECT COUNT(*) AS count FROM appointments WHERE staff_id = ? AND status IN ('pending', 'confirmed')
         AND TIMESTAMP(appointment_date, start_time) > NOW()`,
        [req.params.id]
      )
      if (Number(upcoming?.count)) {
        return fail(res, 400, `${staff.name} 還有 ${upcoming.count} 筆未來的預約，請先改派或取消`)
      }
    }
    await execute('UPDATE staff SET is_active = ? WHERE id = ?', [active ? 1 : 0, req.params.id])
    await logAction(req, active ? '啟用美容師' : '停用美容師', staff.name)
    res.json({ success: true, message: active ? '已啟用' : '已停用，前台不會再顯示' })
  } catch (error) {
    serverError(res, 'Set staff active error', error)
  }
}

export const getStaffSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const schedule = await query<any>(
      'SELECT day_of_week, start_time, end_time, is_working FROM staff_schedule WHERE staff_id = ? ORDER BY day_of_week',
      [req.params.id]
    )
    const leaves = await query<any>(
      `SELECT id, leave_date, start_time, end_time, is_full_day, reason FROM staff_leaves
       WHERE staff_id = ? AND leave_date >= CURDATE() ORDER BY leave_date, start_time`,
      [req.params.id]
    )
    // 沒設定的星期補成休假
    const days = Array.from({ length: 7 }, (_, day) => {
      const row = schedule.find(s => s.day_of_week === day)
      return {
        day,
        start: row ? String(row.start_time).slice(0, 5) : '10:00',
        end: row ? String(row.end_time).slice(0, 5) : '20:00',
        working: row ? !!Number(row.is_working) : false
      }
    })
    res.json({
      success: true,
      data: {
        schedule: days,
        leaves: leaves.map(l => ({
          ...l,
          leave_date: formatDate(l.leave_date),
          start_time: l.start_time ? String(l.start_time).slice(0, 5) : null,
          end_time: l.end_time ? String(l.end_time).slice(0, 5) : null
        }))
      }
    })
  } catch (error) {
    serverError(res, 'Get staff schedule error', error)
  }
}

export const saveStaffSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = req.body.schedule
    if (!Array.isArray(days) || days.length !== 7) return fail(res, 400, '班表格式不正確')
    for (const d of days) {
      if (!d.working) continue
      if (!isTime(d.start) || !isTime(d.end) || d.start >= d.end) {
        return fail(res, 400, '上班時間要早於下班時間')
      }
    }
    const staff = await queryOne<any>('SELECT name FROM staff WHERE id = ?', [req.params.id])
    if (!staff) return fail(res, 404, '美容師不存在')

    for (const [day, d] of days.entries()) {
      await execute(
        `INSERT INTO staff_schedule (staff_id, day_of_week, start_time, end_time, is_working)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), is_working = VALUES(is_working)`,
        [req.params.id, day, isTime(d.start) ? d.start : '10:00', isTime(d.end) ? d.end : '20:00', d.working ? 1 : 0]
      )
    }
    await logAction(req, '修改班表', staff.name)
    res.json({ success: true, message: '班表已儲存，前台可預約時段會跟著更新' })
  } catch (error) {
    serverError(res, 'Save staff schedule error', error)
  }
}

export const addStaffLeave = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, fullDay, start, end } = req.body
    const reason = text(req.body.reason)
    if (!isDate(date)) return fail(res, 400, '請選擇日期')
    if (!fullDay && (!isTime(start) || !isTime(end) || start >= end)) return fail(res, 400, '請填寫正確的請假時段')

    const staff = await queryOne<any>('SELECT name FROM staff WHERE id = ?', [req.params.id])
    if (!staff) return fail(res, 404, '美容師不存在')

    // 請假時段內已經有預約就先提醒
    const conflict = await queryOne<any>(
      `SELECT COUNT(*) AS count FROM appointments
       WHERE staff_id = ? AND appointment_date = ? AND status IN ('pending', 'confirmed')
       ${fullDay ? '' : 'AND start_time < ? AND end_time > ?'}`,
      fullDay ? [req.params.id, date] : [req.params.id, date, end, start]
    )
    if (Number(conflict?.count)) {
      return fail(res, 400, `這段時間已經有 ${conflict.count} 筆預約，請先改派或取消再請假`)
    }

    await execute(
      'INSERT INTO staff_leaves (staff_id, leave_date, start_time, end_time, is_full_day, reason) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, date, fullDay ? null : start, fullDay ? null : end, fullDay ? 1 : 0, reason || null]
    )
    await logAction(req, '新增請假', staff.name, `${date}${fullDay ? ' 整天' : ` ${start}–${end}`}`)
    res.json({ success: true, message: '已新增請假' })
  } catch (error) {
    serverError(res, 'Add staff leave error', error)
  }
}

export const deleteStaffLeave = async (req: Request, res: Response): Promise<void> => {
  try {
    const leave = await queryOne<any>(
      'SELECT l.id, l.leave_date, st.name FROM staff_leaves l JOIN staff st ON st.id = l.staff_id WHERE l.id = ?',
      [req.params.leaveId]
    )
    if (!leave) return fail(res, 404, '請假紀錄不存在')
    await execute('DELETE FROM staff_leaves WHERE id = ?', [leave.id])
    await logAction(req, '刪除請假', leave.name, formatDate(leave.leave_date) || undefined)
    res.json({ success: true, message: '已刪除' })
  } catch (error) {
    serverError(res, 'Delete staff leave error', error)
  }
}
