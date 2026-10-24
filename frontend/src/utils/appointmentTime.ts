// 預約開始時間（資料庫日期是 ISO 字串，轉回本地時間後加上開始時段）
export const appointmentStart = (appt: { appointment_date: string; start_time: string }) => {
  const d = new Date(appt.appointment_date)
  const [h, m] = appt.start_time.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d
}

// 2 天內的預約回傳「今天」「明天」「後天」，其餘回傳空字串
export const upcomingLabel = (appt: { appointment_date: string; start_time: string; status: string }) => {
  if (!['pending', 'confirmed'].includes(appt.status)) return ''
  const start = appointmentStart(appt)
  const now = new Date()
  if (start <= now) return ''
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const days = Math.round((day.getTime() - today.getTime()) / 86400000)
  return ['今天', '明天', '後天'][days] || ''
}
