import { Request, Response } from 'express'
import { query } from '../models/db'

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const services = await query(
      `SELECT s.*, c.name as category_name 
       FROM services s
       JOIN service_categories c ON s.category_id = c.id
       WHERE s.is_active = 1
       ORDER BY s.sort_order, s.name`
    )

    res.json({
      success: true,
      data: services
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
