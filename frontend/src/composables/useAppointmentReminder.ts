import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { appointmentStart, upcomingLabel } from '@/utils/appointmentTime'

const SHOWN_KEY = 'remindedAppointments'

// 導覽列鈴鐺與提醒 toast 共用同一份預約資料
const appointments = ref<any[]>([])

const loadShown = (): number[] => {
  try {
    return JSON.parse(sessionStorage.getItem(SHOWN_KEY) || '[]')
  } catch {
    return []
  }
}

export const refreshReminders = async () => {
  try {
    const res = await apiClient.get('/appointments/my') as any
    appointments.value = res.data || []
  } catch (error) {
    console.error('Load reminders failed:', error)
  }
}

// 店家通知標成已讀（資料庫清掉），畫面上的資料等下次重新整理再更新
export const markNoticesRead = async () => {
  if (!appointments.value.some((appt) => appt.status_notice)) return
  try {
    await apiClient.post('/appointments/notices/read')
  } catch (error) {
    console.error('Mark notices read failed:', error)
  }
}

export const useReminders = () => {
  // 店家確認或取消的預約
  const notices = computed(() => appointments.value.filter((appt) => appt.status_notice))

  // 2 天內（今天、明天、後天）的預約，依時間先後
  const upcoming = computed(() =>
    appointments.value
      .filter((appt) => upcomingLabel(appt))
      .sort((a, b) => appointmentStart(a).getTime() - appointmentStart(b).getTime())
  )

  // 已體驗但還沒寫心得
  const toReview = computed(() =>
    appointments.value.filter(
      (appt) =>
        Number(appt.is_past) && !appt.review_rating && !['cancelled', 'no_show'].includes(appt.status)
    )
  )

  const count = computed(() => notices.value.length + upcoming.value.length + toReview.value.length)

  return { notices, upcoming, toReview, count }
}

// 登入後載入預約，2 天內的預約跳出提醒；同一筆預約在這次瀏覽只提醒一次
export const useAppointmentReminder = () => {
  const authStore = useAuthStore()
  const router = useRouter()
  const toast = useToast()
  const { upcoming } = useReminders()

  const notify = () => {
    const shown = loadShown()
    const fresh = upcoming.value.filter((appt) => !shown.includes(appt.id))
    if (!fresh.length) return

    // 多筆合併成一則，只寫最近的一筆，其餘看鈴鐺
    const first = fresh[0]
    const when = `${upcomingLabel(first)} ${first.start_time.slice(0, 5)}「${first.service_name}」`
    toast.info(
      fresh.length === 1
        ? `提醒：${when}，美容師 ${first.staff_name}`
        : `提醒：2 天內有 ${fresh.length} 筆預約，最近一筆是${when}`,
      { timeout: 8000, onClick: () => router.push('/appointments') }
    )
    shown.push(...fresh.map((appt) => appt.id))

    try {
      sessionStorage.setItem(SHOWN_KEY, JSON.stringify(shown))
    } catch {
      // 存不了就下次重新整理時再提醒
    }
  }

  watch(
    () => authStore.token,
    async (token) => {
      if (!token) {
        appointments.value = []
        return
      }
      await refreshReminders()
      notify()
    },
    { immediate: true }
  )
}
