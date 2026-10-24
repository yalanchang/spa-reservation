<template>
    <div class="appointments-page">
      <div class="page-header">
        <p class="eyebrow">MY BOOKINGS</p>
        <h1>我的預約</h1>
        <p>查看與管理你的預約</p>
      </div>
  
      <div class="container">
        <div v-if="loading" class="loading"><LoadingSpinner /></div>
  
        <div v-else-if="appointments.length === 0" class="empty">
          <p>目前沒有任何預約</p>
          <router-link to="/booking" class="btn btn-primary">立即預約</router-link>
        </div>
  
        <div v-else class="appointments-list">
          <!-- 交叉篩選：條件可以同時套用 -->
          <div class="filter-bar">
            <input v-model.trim="filters.keyword" type="search" class="filter-input filter-keyword" placeholder="搜尋療程、美容師、備註" aria-label="搜尋" />
            <select v-model="filters.status" class="filter-input" aria-label="狀態">
              <option value="">全部狀態</option>
              <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
            </select>
            <select v-model="filters.period" class="filter-input" aria-label="時間">
              <option value="">全部時間</option>
              <option value="upcoming">即將到來</option>
              <option value="past">已過去</option>
              <option value="30">近 30 天</option>
              <option value="90">近 3 個月</option>
            </select>
            <select v-model="filters.service" class="filter-input" aria-label="療程">
              <option value="">全部療程</option>
              <option v-for="name in serviceOptions" :key="name" :value="name">{{ name }}</option>
            </select>
            <select v-model="filters.staff" class="filter-input" aria-label="美容師">
              <option value="">全部美容師</option>
              <option v-for="name in staffOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div class="filter-summary">
            <span>共 {{ filteredAppointments.length }} 筆</span>
            <button v-if="hasFilters" type="button" class="clear-filters" @click="clearFilters">清除篩選</button>
            <select v-model="filters.sort" class="filter-input filter-sort" aria-label="排序">
              <option value="desc">日期 新→舊</option>
              <option value="asc">日期 舊→新</option>
            </select>
          </div>

          <div v-if="!filteredAppointments.length" class="empty">
            <p>沒有符合條件的預約</p>
          </div>

          <div v-for="appt in filteredAppointments" :key="appt.id" class="appt-card">
            <div class="appt-header">
              <div class="badges">
                <span :class="['badge', `badge-${appt.status}`]">{{ statusLabel(appt.status) }}</span>
                <span v-if="upcomingLabel(appt)" class="badge badge-upcoming">{{ upcomingLabel(appt) }}就是預約日</span>
              </div>
              <span class="appt-date">{{ formatDate(appt.appointment_date) }} {{ formatTime(appt.start_time) }}</span>
            </div>
            <div class="appt-body">
              <img :src="serviceImage({ name: appt.service_name })" alt="" class="appt-thumb" />
              <div class="appt-info">
              <h3>{{ appt.service_name }}</h3>
              <div class="appt-detail">
                <span>美容師：{{ appt.staff_name }}</span>
                <span>時程：{{ appt.duration }} 分鐘</span>
                <span class="price">NT$ {{ Number(appt.price).toLocaleString() }}</span>
              </div>
              <p v-if="appt.notes" class="appt-notes">備註：{{ appt.notes }}</p>
              </div>
            </div>
            <!-- 還沒到的預約：可修改、刪除 -->
            <div class="appt-actions" v-if="!Number(appt.is_past) && (appt.status === 'pending' || appt.status === 'confirmed')">
              <button class="btn btn-outline btn-sm" @click="editingAppt = appt">修改預約</button>
              <button class="btn btn-danger btn-sm" :disabled="deletingId === appt.id" @click="cancelAppt(appt.id)">
                <LoadingSpinner v-if="deletingId === appt.id" size="sm" />
                <template v-else>刪除預約</template>
              </button>
            </div>

            <!-- 已體驗的預約：寫心得或顯示心得 -->
            <template v-else-if="Number(appt.is_past) && appt.status !== 'cancelled' && appt.status !== 'no_show'">
              <div v-if="appt.review_rating" class="my-review">
                <div class="my-review-head">
                  <span>我的心得</span>
                  <StarRating :model-value="appt.review_rating" readonly size="sm" />
                </div>
                <p>{{ appt.review_comment }}</p>
                <p v-if="appt.review_reply" class="my-review-reply">
                  <span>店家回覆：</span>{{ appt.review_reply }}
                </p>
              </div>
              <div v-else class="appt-actions">
                <button class="btn btn-primary btn-sm" @click="reviewingAppt = appt">撰寫心得</button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <ReviewModal
        v-if="reviewingAppt"
        :appointment="reviewingAppt"
        @close="reviewingAppt = null"
        @saved="onReviewed"
      />

      <EditAppointmentModal
        v-if="editingAppt"
        :appointment="editingAppt"
        @close="editingAppt = null"
        @saved="onEdited"
      />
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import apiClient from '@/api/client'
  import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
  import EditAppointmentModal from '@/components/appointments/EditAppointmentModal.vue'
  import { serviceImage } from '@/utils/serviceImage'
  import { upcomingLabel } from '@/utils/appointmentTime'
  import { refreshReminders, markNoticesRead } from '@/composables/useAppointmentReminder'
  import ReviewModal from '@/components/appointments/ReviewModal.vue'
  import StarRating from '@/components/common/StarRating.vue'
  import { useToast } from 'vue-toastification'
  import { useConfirm } from '@/composables/useConfirm'

  const toast = useToast()
  const confirm = useConfirm()
  
  const appointments = ref<any[]>([])
  const loading = ref(true)
  const deletingId = ref<number | null>(null)
  const editingAppt = ref<any | null>(null)
  const reviewingAppt = ref<any | null>(null)
  const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

const formatTime = (timeStr: string) => {
  return timeStr?.slice(0, 5)
}
  const STATUS_LABELS: Record<string, string> = {
    pending: '待確認', confirmed: '已確認',
    completed: '已完成', cancelled: '已取消', no_show: '未到店'
  }
  const statusLabel = (s: string) => STATUS_LABELS[s] || s

  const EMPTY_FILTERS = { keyword: '', status: '', period: '', service: '', staff: '', sort: 'desc' }
  const filters = ref({ ...EMPTY_FILTERS })
  const hasFilters = computed(() =>
    (Object.keys(EMPTY_FILTERS) as (keyof typeof EMPTY_FILTERS)[]).some(k => k !== 'sort' && filters.value[k])
  )
  const clearFilters = () => { filters.value = { ...EMPTY_FILTERS, sort: filters.value.sort } }

  // 下拉選項只列出自己預約過的療程與美容師
  const unique = (list: string[]) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
  const serviceOptions = computed(() => unique(appointments.value.map(a => a.service_name)))
  const staffOptions = computed(() => unique(appointments.value.map(a => a.staff_name)))

  const startOf = (a: any) => new Date(`${String(a.appointment_date).slice(0, 10)}T${a.start_time}`).getTime()

  const filteredAppointments = computed(() => {
    const f = filters.value
    const now = Date.now()
    const keyword = f.keyword.toLowerCase()
    const list = appointments.value.filter(a => {
      if (f.status && a.status !== f.status) return false
      if (f.service && a.service_name !== f.service) return false
      if (f.staff && a.staff_name !== f.staff) return false
      if (f.period === 'upcoming' && Number(a.is_past)) return false
      if (f.period === 'past' && !Number(a.is_past)) return false
      if ((f.period === '30' || f.period === '90') && (startOf(a) < now - Number(f.period) * 86400000 || startOf(a) > now)) return false
      if (keyword && ![a.service_name, a.staff_name, a.notes].some(v => String(v || '').toLowerCase().includes(keyword))) return false
      return true
    })
    return list.sort((a, b) => (f.sort === 'asc' ? 1 : -1) * (startOf(a) - startOf(b)))
  })
  
  const fetchAppointments = async () => {
    try {
      const res = await apiClient.get('/appointments/my')
      appointments.value = res.data || []
      // 已經在「我的預約」看到最新狀態，店家通知就算已讀
      await refreshReminders()
      await markNoticesRead()
      await refreshReminders()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || '預約載入失敗，請重新整理')
    } finally {
      loading.value = false
    }
  }
  
  const cancelAppt = async (id: number) => {
    const ok = await confirm({
      title: '確定要刪除此預約嗎？',
      message: '刪除後無法復原',
      confirmText: '刪除',
      danger: true
    })
    if (!ok) return
    deletingId.value = id
    try {
      await apiClient.delete(`/appointments/${id}`)
      await fetchAppointments()
      toast.success('預約已刪除')
    } catch (e: any) {
      toast.error(e?.message || '刪除失敗，請稍後再試')
    } finally {
      deletingId.value = null
    }
  }
  
  const onReviewed = async () => {
    reviewingAppt.value = null
    await fetchAppointments()
  }

  const onEdited = async () => {
    editingAppt.value = null
    await fetchAppointments()
  }

  onMounted(fetchAppointments)
  </script>
  
  <style scoped>
  .appointments-page { padding-bottom: 80px; }
  .page-header { text-align: center; padding: 24px 20px 32px; }
  .page-header .eyebrow { font-size: 0.85rem; font-weight: 600; color: #f0608a; margin-bottom: 6px; }
  .page-header h1 { font-size: 1.9rem; font-weight: 700; color: #5b4a4f; margin-bottom: 6px; }
  .page-header p { color: #9a8a8f; }
  .container { max-width: 800px; margin: 0 auto; padding: 0 8px; }
  .loading, .empty { text-align: center; padding: 48px 20px; color: #9a8a8f; }
  .empty a { display: inline-block; margin-top: 16px; }

  .filter-bar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .filter-keyword { grid-column: 1 / -1; }
  @media (min-width: 768px) {
    .filter-bar { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  .filter-input {
    width: 100%; padding: 10px 12px; border: 1px solid #f1e4e8; border-radius: 12px; background: white;
    color: #5b4a4f; font-size: 0.88rem;
  }
  .filter-input:focus { outline: none; border-color: #ffa8bd; box-shadow: 0 0 0 3px #ffe4ea; }
  .filter-summary { display: flex; gap: 12px; align-items: center; margin: 14px 2px 18px; font-size: 0.85rem; color: #9a8a8f; }
  .filter-sort { width: auto; margin-left: auto; padding: 6px 10px; }
  .clear-filters { border: none; background: none; color: #d63d6a; font-weight: 600; cursor: pointer; }

  .appt-card {
    background: white; border-radius: 24px; box-shadow: 0 8px 24px -8px rgba(214, 61, 106, 0.18);
    padding: 20px 24px; margin-bottom: 16px; transition: transform 0.25s, box-shadow 0.25s;
  }

  .appt-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .appt-date { font-size: 0.88rem; color: #9a8a8f; }
  .appt-body { display: flex; gap: 16px; align-items: flex-start; }
  .appt-thumb { width: 72px; height: 72px; border-radius: 16px; object-fit: cover; flex-shrink: 0; }
  .appt-info { flex: 1; min-width: 0; }
  .appt-body h3 { font-size: 1.25rem; font-weight: 700; color: #5b4a4f; margin-bottom: 6px; }
  .appt-detail { display: flex; gap: 6px 18px; font-size: 0.88rem; color: #9a8a8f; flex-wrap: wrap; }
  .price { color: #d63d6a; font-weight: 600; }
  .appt-notes { font-size: 0.85rem; color: #9a8a8f; margin-top: 8px; }
  .appt-actions { display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #ffccd8; justify-content: flex-end; }

  /* 狀態：小圓點加文字，不用膠囊標籤 */
  .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; }
  .badge::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
  .badge-pending { color: #b7791f; }
  .badge-confirmed { color: #2f7a55; }
  .badge-completed { color: #6246b8; }
  .badge-cancelled { color: #8a7a80; }
  .badge-no_show { color: #dc2626; }
  .badge-upcoming { color: #d63d6a; }
  .badge-upcoming::before { display: none; }
  .badges { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }

  .my-review { margin-top: 16px; padding: 14px 16px; border-radius: 16px; background: #fff5f7; }
  .my-review-head { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; font-weight: 600; color: #d63d6a; margin-bottom: 6px; }
  .my-review p { font-size: 0.9rem; color: #5b4a4f; line-height: 1.6; }
  .my-review .my-review-reply { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ffccd8; font-size: 0.85rem; }
  .my-review-reply span { font-weight: 600; color: #d63d6a; }

  .btn { display: inline-flex; align-items: center; padding: 10px 24px; border: none; border-radius: 50px; cursor: pointer; font-size: 0.88rem; font-weight: 600; transition: all 0.2s; }
  .btn:hover { font-weight: 700; }
  .btn:active { transform: scale(0.95); }
  .btn-primary { background: #d63d6a; color: white; }
  .btn-danger { background: #fff5f7; color: #d63d6a; justify-content: center; min-width: 96px; }
  .btn-outline { background: white; color: #5b4a4f; border: 2px solid #ffccd8; justify-content: center; min-width: 96px; }
  .btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
  .btn-sm { padding: 7px 16px; font-size: 0.82rem; }
  </style>
