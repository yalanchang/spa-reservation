// 優惠券的顯示文字：15% off →「85 折」、10% off →「9 折」
export const couponValueText = (c: { discount_type: string; discount_value: number }) => {
  if (c.discount_type !== 'percent') return `NT$${Number(c.discount_value).toLocaleString()}`
  const rate = 100 - Number(c.discount_value)
  return `${rate % 10 ? rate : rate / 10} 折`
}

export const couponConditionText = (c: { min_spend: number; per_user_limit: number }) =>
  [
    Number(c.min_spend) ? `滿 NT$${Number(c.min_spend).toLocaleString()} 可用` : '無最低消費',
    `每人限用 ${c.per_user_limit} 次`
  ].join('，')

export const couponPeriodText = (c: { start_date: string | null; end_date: string | null }) => {
  if (!c.start_date && !c.end_date) return '永久有效'
  if (!c.end_date) return `${c.start_date} 起`
  return `${c.start_date ? `${c.start_date} ~ ` : ''}${c.end_date} 止`
}
