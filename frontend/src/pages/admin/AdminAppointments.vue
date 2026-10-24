<template>
  <div class="space-y-4">
    <!-- 快速檢視 -->
    <div class="flex gap-1 overflow-x-auto border-b border-gray-200 text-sm">
      <button
        v-for="v in views"
        :key="v.value"
        class="-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1"
        :class="
          view === v.value
            ? 'border-blue-600 font-medium text-gray-900'
            : 'border-transparent text-gray-500 hover:text-gray-800'
        "
        @click="selectView(v.value)"
      >
        {{ v.label }}
        <span v-if="v.count" class="ml-1 rounded bg-red-50 px-1.5 text-xs text-red-600">{{ v.count }}</span>
      </button>
    </div>

    <!-- 篩選 -->
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <input
        v-model="date"
        type="date"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="指定日期"
      />
      <select
        v-model="status"
        class="rounded-md border border-gray-300 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="狀態"
      >
        <option value="">全部狀態</option>
        <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
      </select>
      <input
        v-model="keyword"
        type="search"
        placeholder="搜尋姓名、電話"
        class="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
      />
      <button
        v-if="date || status || keyword"
        class="px-2 py-1.5 text-gray-500 hover:text-gray-900"
        @click="resetFilters"
      >
        清除篩選
      </button>
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          class="admin-btn-outline"
          :disabled="exporting"
          :title="date ? '匯出這一天的預約' : '匯出本月的預約'"
          @click="exportCsv"
        >
          <LoadingSpinner v-if="exporting" size="sm" />
          <template v-else>匯出 CSV</template>
        </button>
        <button type="button" class="admin-btn" @click="bookingOpen = true">新增預約</button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table class="w-full min-w-[960px] text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="px-4 py-2.5 font-medium">預約時間</th>
            <th class="px-4 py-2.5 font-medium">顧客</th>
            <th class="px-4 py-2.5 font-medium">服務項目</th>
            <th class="px-4 py-2.5 font-medium">美容師</th>
            <th class="px-4 py-2.5 font-medium text-right">金額</th>
            <th class="px-4 py-2.5 font-medium">狀態</th>
            <th class="px-4 py-2.5 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading">
            <td colspan="7" class="py-12 text-gray-400"><LoadingSpinner /></td>
          </tr>
          <tr v-else-if="!appointments.length">
            <td colspan="7" class="py-12 text-center text-gray-400">沒有符合條件的預約</td>
          </tr>
          <tr v-for="appt in appointments" v-else :key="appt.id" class="align-top hover:bg-gray-50">
            <td class="whitespace-nowrap px-4 py-3">
              <p class="font-medium text-gray-900">{{ formatDateWithWeekday(appt.appointment_date) }}</p>
              <p class="text-gray-500">{{ appt.start_time.slice(0, 5) }}–{{ appt.end_time.slice(0, 5) }}</p>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ appt.customer_name }}</p>
              <p class="text-gray-500">{{ appt.customer_phone }}</p>
            </td>
            <td class="px-4 py-3">
              <p>
                {{ appt.service_name }}<span class="ml-2 text-gray-400">{{ appt.duration }} 分鐘</span>
              </p>
              <p v-if="appt.notes" class="mt-0.5 max-w-xs text-xs text-gray-500">備註：{{ appt.notes }}</p>
              <p
                v-if="appt.customer_skin_type || appt.customer_care_notes"
                class="mt-0.5 max-w-xs text-xs text-amber-700"
              >
                顧客資料：{{
                  [SKIN_LABELS[appt.customer_skin_type], appt.customer_care_notes].filter(Boolean).join('，')
                }}
              </p>
            </td>
            <td class="whitespace-nowrap px-4 py-3">{{ appt.staff_name }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">{{ Number(appt.price).toLocaleString() }}</td>
            <td class="whitespace-nowrap px-4 py-3">
              <span class="rounded px-2 py-0.5 text-xs font-medium" :class="STATUS_CLASSES[appt.status]">
                {{ STATUS_LABELS[appt.status] }}
              </span>
              <p v-if="isOverdue(appt)" class="mt-1 text-xs text-red-600">待標記結果</p>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <ActionMenu
                v-if="appt.next_statuses.length"
                label="變更狀態"
                :items="menuItems(appt)"
                :loading="updatingId === appt.id"
                :disabled="updatingId === appt.id"
                @select="(next) => changeStatus(appt, next)"
              />
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!loading && appointments.length" class="text-xs text-gray-500">
      共 {{ appointments.length }} 筆<template v-if="appointments.length >= 200"
        >，只顯示前 200 筆，請縮小篩選範圍</template
      >
    </p>
    <AdminBookingModal :open="bookingOpen" @close="bookingOpen = false" @created="onBooked" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ActionMenu from '@/components/common/ActionMenu.vue'
import AdminBookingModal from '@/components/admin/AdminBookingModal.vue'
import { downloadAppointmentsCsv } from '@/utils/adminExport'
import { useConfirm } from '@/composables/useConfirm'
import { useAdminStats } from '@/composables/useAdminStats'
import { STATUS_LABELS, STATUS_CLASSES, STATUS_ACTIONS, formatDateWithWeekday } from '@/utils/appointmentStatus'

const toast = useToast()
const confirm = useConfirm()
const { stats, refresh: refreshStats } = useAdminStats()

const SKIN_LABELS: Record<string, string> = {
  dry: '乾性肌',
  oily: '油性肌',
  combination: '混合肌',
  normal: '中性肌',
  sensitive: '敏感肌'
}

// 快速檢視對應到的 API 參數
const VIEW_PARAMS: Record<string, { range: string; status?: string }> = {
  upcoming: { range: 'upcoming' },
  pending: { range: 'upcoming', status: 'pending' },
  to_finish: { range: 'past', status: 'to_finish' },
  past: { range: 'past' },
  all: { range: 'all' }
}

const view = ref('upcoming')
const date = ref('')
const status = ref('')
const keyword = ref('')
const appointments = ref<any[]>([])
const loading = ref(true)
const updatingId = ref<number | null>(null)

const views = computed(() => [
  { value: 'upcoming', label: '即將到來' },
  { value: 'pending', label: '待確認', count: stats.value?.pending },
  { value: 'to_finish', label: '待處理', count: stats.value?.toFinish },
  { value: 'past', label: '已過' },
  { value: 'all', label: '全部' }
])

const menuItems = (appt: any) =>
  appt.next_statuses.map((next: string) => ({
    value: next,
    label: STATUS_ACTIONS[next],
    danger: next === 'cancelled' || next === 'no_show'
  }))

const isOverdue = (appt: any) => Number(appt.is_past) && ['pending', 'confirmed'].includes(appt.status)

const selectView = (value: string) => {
  view.value = value
  date.value = ''
  status.value = ''
}

const resetFilters = () => {
  date.value = ''
  status.value = ''
  keyword.value = ''
}

const fetchAppointments = async () => {
  loading.value = true
  const params = VIEW_PARAMS[view.value]
  try {
    const res = (await apiClient.get('/admin/appointments', {
      params: {
        // 指定日期時不限即將到來或已過
        range: date.value ? 'all' : params.range,
        date: date.value || undefined,
        status: status.value || params.status || undefined,
        q: keyword.value.trim() || undefined
      }
    })) as any
    appointments.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '預約載入失敗')
  } finally {
    loading.value = false
  }
}

const changeStatus = async (appt: any, next: string) => {
  // 取消、未到店要再確認一次
  if (next === 'cancelled' || next === 'no_show') {
    const ok = await confirm({
      title: next === 'cancelled' ? '確定要取消這筆預約嗎？' : '確定要標記為未到店嗎？',
      message: `${appt.customer_name}，${formatDateWithWeekday(appt.appointment_date)} ${appt.start_time.slice(0, 5)} ${appt.service_name}`,
      confirmText: STATUS_ACTIONS[next],
      danger: true
    })
    if (!ok) return
  }

  updatingId.value = appt.id
  try {
    await apiClient.patch(`/admin/appointments/${appt.id}/status`, { status: next })
    toast.success(`已改為「${STATUS_LABELS[next]}」`)
    await Promise.all([fetchAppointments(), refreshStats()])
  } catch (error: any) {
    toast.error(error?.message || '更新失敗，請稍後再試')
  } finally {
    updatingId.value = null
  }
}

// 搜尋字輸入停下來 300ms 後才查詢
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchAppointments, 300)
})
watch([view, date, status], fetchAppointments)

// ---- 代客預約、匯出
const bookingOpen = ref(false)
const exporting = ref(false)

const onBooked = async () => {
  bookingOpen.value = false
  await Promise.all([fetchAppointments(), refreshStats()])
}

const exportCsv = async () => {
  exporting.value = true
  try {
    const now = new Date()
    const from = date.value || new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE')
    const to = date.value || new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('sv-SE')
    await downloadAppointmentsCsv(from, to)
  } catch (error: any) {
    toast.error(error?.message || '匯出失敗')
  } finally {
    exporting.value = false
  }
}

onMounted(fetchAppointments)
</script>
