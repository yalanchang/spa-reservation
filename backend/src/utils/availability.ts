import { query, queryOne } from '../models/db'

// 時段間隔（分鐘）
const STEP = 30

const toMinutes = (time: string) => {
  const [h, m] = String(time).split(':').map(Number)
  return h * 60 + m
}

// 預約的日期、時間都是台北時間；伺服器可能在 UTC，要帶時區再比較
export const taipeiTime = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00+08:00`)

export const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const addMinutes = (time: string, minutes: number) => toTime(toMinutes(time) + minutes)

interface Interval {
  start: number
  end: number
}

const overlaps = (a: Interval, list: Interval[]) => list.some((b) => a.start < b.end && a.end > b.start)

// 某天某位美容師的上班時間與已占用的區間；沒上班回傳 null
const loadStaffDay = async (staffId: number, date: string, excludeAppointmentId?: number) => {
  const day = new Date(`${date}T00:00:00`).getDay()
  const schedule = await queryOne<any>(
    'SELECT start_time, end_time, is_working FROM staff_schedule WHERE staff_id = ? AND day_of_week = ?',
    [staffId, day]
  )
  if (!schedule || !Number(schedule.is_working)) return null

  const leaves = await query<any>(
    'SELECT start_time, end_time, is_full_day FROM staff_leaves WHERE staff_id = ? AND leave_date = ?',
    [staffId, date]
  )
  if (leaves.some((l) => Number(l.is_full_day))) return null

  const booked = await query<any>(
    `SELECT start_time, end_time FROM appointments
     WHERE staff_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'no_show') AND id <> ?`,
    [staffId, date, excludeAppointmentId || 0]
  )

  return {
    open: toMinutes(schedule.start_time),
    close: toMinutes(schedule.end_time),
    busy: [...leaves, ...booked].map((b) => ({ start: toMinutes(b.start_time), end: toMinutes(b.end_time) }))
  }
}

export const getClosure = (date: string) =>
  queryOne<any>('SELECT reason FROM store_closures WHERE closure_date = ?', [date])

const activeStaffIds = async (staffId?: number | null) => {
  if (staffId) {
    const staff = await queryOne<any>('SELECT id FROM staff WHERE id = ? AND is_active = 1', [staffId])
    return staff ? [staff.id] : []
  }
  return (await query<any>('SELECT id FROM staff WHERE is_active = 1 ORDER BY id')).map((s) => s.id)
}

interface Options {
  date: string
  duration: number
  staffId?: number | null
  excludeAppointmentId?: number
}

// 回傳每個時段可以服務的美容師
export const getSlotStaff = async ({ date, duration, staffId, excludeAppointmentId }: Options) => {
  const slots = new Map<string, number[]>()
  if (await getClosure(date)) return slots

  const now = new Date()
  for (const id of await activeStaffIds(staffId)) {
    const day = await loadStaffDay(id, date, excludeAppointmentId)
    if (!day) continue
    for (let start = day.open; start + duration <= day.close; start += STEP) {
      if (taipeiTime(date, toTime(start)) <= now) continue
      if (overlaps({ start, end: start + duration }, day.busy)) continue
      const time = toTime(start)
      slots.set(time, [...(slots.get(time) || []), id])
    }
  }
  return new Map([...slots.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

// 指定時段找一位有空的美容師；指定了美容師就只看那位
export const findFreeStaff = async (options: Options & { time: string }) => {
  const slots = await getSlotStaff(options)
  return slots.get(options.time.slice(0, 5))?.[0] ?? null
}
