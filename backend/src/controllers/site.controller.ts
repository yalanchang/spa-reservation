// 前台公開資料：跑馬燈公告、公休日
import { Request, Response } from 'express'
import { query } from '../models/db'
import { serverError, formatDate } from '../utils/http'

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<any>(
      `SELECT id, content FROM announcements
       WHERE is_active = 1
         AND (start_date IS NULL OR start_date <= CURDATE())
         AND (end_date IS NULL OR end_date >= CURDATE())
       ORDER BY sort_order, id`
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    serverError(res, 'Get announcements error', error)
  }
}

export const getClosures = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<any>(
      'SELECT closure_date, reason FROM store_closures WHERE closure_date >= CURDATE() ORDER BY closure_date LIMIT 60'
    )
    res.json({ success: true, data: rows.map(r => ({ date: formatDate(r.closure_date), reason: r.reason })) })
  } catch (error) {
    serverError(res, 'Get closures error', error)
  }
}
