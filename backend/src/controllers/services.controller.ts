import { Request, Response } from 'express'
import { query } from '../models/db'

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    // 一併帶出平均評分與心得數，給篩選排序與卡片顯示
    const services = await query(
      `SELECT s.*, c.name as category_name,
              r.average_rating, COALESCE(r.review_count, 0) AS review_count
       FROM services s
       JOIN service_categories c ON s.category_id = c.id
       LEFT JOIN (
         SELECT service_id, ROUND(AVG(rating), 1) AS average_rating, COUNT(*) AS review_count
         FROM reviews GROUP BY service_id
       ) r ON r.service_id = s.id
       WHERE s.is_active = 1
       ORDER BY s.sort_order, s.name`
    )

    res.json({
      success: true,
      data: services.map((s: any) => ({
        ...s,
        average_rating: s.average_rating === null ? null : Number(s.average_rating),
        review_count: Number(s.review_count)
      }))
    })
  } catch (error) {
    console.error('Get services error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const getServiceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const services = await query(
      `SELECT s.*, c.name as category_name 
      FROM services s
      JOIN service_categories c ON s.category_id = c.id
      WHERE s.id = ? AND s.is_active = 1`,
     [id]
    )

    if (services.length === 0) {
      res.status(404).json({ 
        success: false, 
        message: '服務不存在' 
      })
      return
    }

    res.json({
      success: true,
      data: services[0]
    })
  } catch (error) {
    console.error('Get service error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await query(
      'SELECT * FROM service_categories WHERE is_active = 1 ORDER BY sort_order'
    )

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}
