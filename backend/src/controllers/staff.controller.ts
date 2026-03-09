import { Request, Response } from 'express'
import { query } from '../models/db'

export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const staff = await query(
      `SELECT id, name, title, avatar, years_experience, bio 
       FROM staff WHERE is_active = 1
       ORDER BY years_experience DESC`
    )

    res.json({
      success: true,
      data: staff
    })
  } catch (error) {
    console.error('Get staff error:', error)
    res.status(500).json({ 
      success: false, 
      message: '伺服器錯誤' 
    })
  }
}
