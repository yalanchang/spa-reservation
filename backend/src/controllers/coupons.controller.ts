// 前台優惠券：領券中心、領取、我的券夾
import { Request, Response } from 'express'
import { queryOne } from '../models/db'
import { fail, serverError } from '../utils/http'
import { listClaimableCoupons, claimCoupon, claimAllCoupons, listMyCoupons, CouponError } from '../utils/coupon'

export const getCouponCenter = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await listClaimableCoupons(req.user?.userId || null) })
  } catch (error) {
    serverError(res, 'Get coupon center error', error)
  }
}

export const claim = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await claimCoupon(req.user!.userId, Number(req.params.id))
    res.json({ success: true, message: `已領取「${coupon.name}」，預約時就能使用` })
  } catch (error) {
    if (error instanceof CouponError) return fail(res, 400, error.message)
    serverError(res, 'Claim coupon error', error)
  }
}

export const getMyCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    let price: number | undefined
    if (req.query.serviceId) {
      const service = await queryOne<any>('SELECT price FROM services WHERE id = ?', [req.query.serviceId])
      if (service) price = Number(service.price)
    }
    res.json({ success: true, data: await listMyCoupons(req.user!.userId, price) })
  } catch (error) {
    serverError(res, 'Get my coupons error', error)
  }
}

export const claimAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await claimAllCoupons(req.user!.userId)
    res.json({
      success: true,
      data: { count },
      message: count ? `已領取 ${count} 張優惠券` : '目前沒有可以領的優惠券'
    })
  } catch (error) {
    serverError(res, 'Claim all coupons error', error)
  }
}
