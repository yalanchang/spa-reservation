import { Request, Response } from 'express'
import { query } from '../models/db'

export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await query(
      `SELECT st.id, st.name, st.title, st.avatar, st.years_experience, st.bio,
              r.average_rating, COALESCE(r.review_count, 0) AS review_count,
              (SELECT GROUP_CONCAT(day_of_week ORDER BY day_of_week) FROM staff_schedule ss
               WHERE ss.staff_id = st.id AND ss.is_working = 1) AS working_days
       FROM staff st
       LEFT JOIN (
         SELECT staff_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS review_count
         FROM reviews GROUP BY staff_id
       ) r ON r.staff_id = st.id
       WHERE st.is_active = 1
       ORDER BY st.years_experience DESC`
    )

    res.json({
      success: true,
      data: staff.map((s: any) => ({
        ...s,
        average_rating: s.average_rating === null ? null : Number(s.average_rating),
        review_count: Number(s.review_count),
        working_days: s.working_days ? String(s.working_days).split(',').map(Number) : []
      }))
    })
  } catch (error) {
    console.error('Get staff error:', error)
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    })
  }
}
