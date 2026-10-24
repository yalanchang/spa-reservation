import { query, queryOne, execute } from '../models/db'

export class CouponError extends Error {}

// 領取資格
export const AUDIENCES: Record<string, string> = {
  all: '全體會員',
  new: '新會員首次預約',
  birthday: '生日當月壽星',
  silver: '銀卡以上會員',
  gold: '金卡會員'
}

const SILVER_SPEND = 10000
const GOLD_SPEND = 30000

const taipeiToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
const toDay = (d: unknown) => (d ? new Date(d as string).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }) : null)

// 會員符合資格要用到的資料
const loadMember = async (userId: number) => {
  const member = await queryOne<any>(
    `SELECT u.birthday,
            COALESCE((SELECT SUM(price) FROM appointments WHERE user_id = u.id AND status = 'completed'), 0) AS spend,
            (SELECT COUNT(*) FROM appointments WHERE user_id = u.id AND status <> 'cancelled') AS bookings
     FROM users u WHERE u.id = ?`,
    [userId]
  )
  return {
    birthMonth: member?.birthday ? new Date(member.birthday).getMonth() + 1 : null,
    spend: Number(member?.spend || 0),
    bookings: Number(member?.bookings || 0)
  }
}

type Member = Awaited<ReturnType<typeof loadMember>>

// 不符合資格時回傳原因
const audienceProblem = (audience: string, member: Member, excludeBooking = false) => {
  const bookings = member.bookings - (excludeBooking ? 1 : 0)
  const gap = (target: number) => `NT$${(target - member.spend).toLocaleString()}`
  switch (audience) {
    case 'new':
      return bookings > 0 ? '新會員首次預約專屬' : null
    case 'birthday':
      if (!member.birthMonth) return '壽星專屬，填寫生日後即可領取'
      return member.birthMonth !== Number(taipeiToday().slice(5, 7)) ? '壽星專屬，生日當月即可領取' : null
    case 'silver':
      return member.spend < SILVER_SPEND ? `銀卡會員專屬，再消費 ${gap(SILVER_SPEND)} 即可領取` : null
    case 'gold':
      return member.spend < GOLD_SPEND ? `金卡會員專屬，再消費 ${gap(GOLD_SPEND)} 即可領取` : null
    default:
      return null
  }
}

// 領不到時按鈕上的短說明
const shortReason = (coupon: any, member: Member | null) => {
  const today = taipeiToday()
  if (toDay(coupon.start_date) && today < toDay(coupon.start_date)!) return '即將開放'
  if (coupon.usage_limit !== null && Number(coupon.used_count) >= Number(coupon.usage_limit)) return '已領完'
  if (!member) return null
  switch (coupon.audience) {
    case 'new': return '新會員限定'
    case 'birthday': return member.birthMonth ? '生日當月可領' : '填寫生日'
    case 'silver': return '升級銀卡可領'
    case 'gold': return '升級金卡可領'
    default: return '暫不可領'
  }
}

// 優惠券本身是否在有效期間、還有名額
const couponProblem = (coupon: any) => {
  const today = taipeiToday()
  if (!Number(coupon.is_active)) return '活動已結束'
  if (toDay(coupon.start_date) && today < toDay(coupon.start_date)!) return `${toDay(coupon.start_date)} 開始`
  if (toDay(coupon.end_date) && today > toDay(coupon.end_date)!) return '已過期'
  if (coupon.usage_limit !== null && Number(coupon.used_count) >= Number(coupon.usage_limit)) return '已被領用完畢'
  return null
}

const COUPON_FIELDS = `c.*,
  (SELECT COUNT(*) FROM appointments a WHERE a.coupon_id = c.id AND a.status <> 'cancelled' AND a.id <> ?) AS used_count,
  (SELECT COUNT(*) FROM appointments a WHERE a.coupon_id = c.id AND a.status <> 'cancelled' AND a.user_id = ? AND a.id <> ?) AS my_used`

const discountOf = (coupon: any, price: number) => {
  const raw = coupon.discount_type === 'percent'
    ? Math.round(price * Number(coupon.discount_value) / 100)
    : Number(coupon.discount_value)
  return Math.min(raw, price)
}

const publicCoupon = (c: any) => ({
  id: c.id,
  code: c.code,
  name: c.name,
  description: c.description,
  discount_type: c.discount_type,
  discount_value: Number(c.discount_value),
  min_spend: Number(c.min_spend),
  start_date: toDay(c.start_date),
  end_date: toDay(c.end_date),
  audience: c.audience,
  audience_label: AUDIENCES[c.audience] || AUDIENCES.all,
  per_user_limit: Number(c.per_user_limit)
})

// 檢查優惠碼並算出折扣；不能用時丟出 CouponError（訊息直接給顧客看）
// 用券前會自動領取，所以輸入優惠碼也算領券
export const applyCoupon = async (rawCode: unknown, price: number, userId: number, excludeAppointmentId = 0) => {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : ''
  if (!code) return { coupon: null, discount: 0 }

  const coupon = await queryOne<any>(
    `SELECT ${COUPON_FIELDS} FROM coupons c WHERE c.code = ?`,
    [excludeAppointmentId, userId, excludeAppointmentId, code]
  )
  if (!coupon) throw new CouponError('查無此優惠碼')

  const problem = couponProblem(coupon)
  if (problem) throw new CouponError(`這張優惠券${problem.endsWith('開始') ? `要到 ${problem}` : problem}`)

  const member = await loadMember(userId)
  const notEligible = audienceProblem(coupon.audience, member, !!excludeAppointmentId)
  if (notEligible) throw new CouponError(notEligible)

  if (Number(coupon.my_used) >= Number(coupon.per_user_limit)) {
    throw new CouponError(`每人限用 ${coupon.per_user_limit} 次，你已經用完了`)
  }
  if (price < Number(coupon.min_spend)) {
    throw new CouponError(`消費滿 NT$ ${Number(coupon.min_spend).toLocaleString()} 才能使用`)
  }

  await execute('INSERT IGNORE INTO user_coupons (user_id, coupon_id) VALUES (?, ?)', [userId, coupon.id])
  return { coupon, discount: discountOf(coupon, price) }
}

// 領券中心：所有開放領取的券，附上這位會員能不能領
export const listClaimableCoupons = async (userId: number | null) => {
  const coupons = await query<any>(
    `SELECT ${COUPON_FIELDS},
            (SELECT COUNT(*) FROM user_coupons uc WHERE uc.coupon_id = c.id AND uc.user_id = ?) AS claimed
     FROM coupons c
     WHERE c.is_active = 1 AND c.is_claimable = 1
       AND (c.end_date IS NULL OR c.end_date >= CURDATE())
     ORDER BY c.created_at DESC`,
    [0, userId || 0, 0, userId || 0]
  )
  const member = userId ? await loadMember(userId) : null
  return coupons.map(c => {
    const problem = couponProblem(c) || (member ? audienceProblem(c.audience, member) : null)
    return {
      ...publicCoupon(c),
      claimed: !!Number(c.claimed),
      problem,
      button: problem ? shortReason(c, member) : null,
      // 缺生日可以直接去填
      need_birthday: !!member && c.audience === 'birthday' && !member.birthMonth
    }
  })
}

export const claimCoupon = async (userId: number, couponId: number) => {
  const coupon = await queryOne<any>(
    `SELECT ${COUPON_FIELDS} FROM coupons c WHERE c.id = ? AND c.is_claimable = 1`,
    [0, userId, 0, couponId]
  )
  if (!coupon) throw new CouponError('找不到這張優惠券')
  const problem = couponProblem(coupon) || audienceProblem(coupon.audience, await loadMember(userId))
  if (problem) throw new CouponError(problem)
  await execute('INSERT IGNORE INTO user_coupons (user_id, coupon_id) VALUES (?, ?)', [userId, couponId])
  return coupon
}

// 我的券夾；price 有給的話一併算出這筆預約能折多少
export const listMyCoupons = async (userId: number, price?: number) => {
  const coupons = await query<any>(
    `SELECT ${COUPON_FIELDS}, uc.claimed_at
     FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
     WHERE uc.user_id = ?
     ORDER BY uc.claimed_at DESC`,
    [0, userId, 0, userId]
  )
  const member = await loadMember(userId)
  return coupons.map(c => {
    const usedUp = Number(c.my_used) >= Number(c.per_user_limit)
    const problem = usedUp ? null : couponProblem(c) || audienceProblem(c.audience, member)
    const status = usedUp ? 'used' : problem ? 'unavailable' : 'available'
    return {
      ...publicCoupon(c),
      claimed_at: c.claimed_at,
      used_count: Number(c.my_used),
      status,
      problem,
      discount: price !== undefined && status === 'available' && price >= Number(c.min_spend) ? discountOf(c, price) : null
    }
  })
}

// 一鍵全領：只領符合資格、還沒領過的
export const claimAllCoupons = async (userId: number) => {
  const claimable = (await listClaimableCoupons(userId)).filter(c => !c.claimed && !c.problem)
  for (const c of claimable) {
    await execute('INSERT IGNORE INTO user_coupons (user_id, coupon_id) VALUES (?, ?)', [userId, c.id])
  }
  return claimable.length
}
