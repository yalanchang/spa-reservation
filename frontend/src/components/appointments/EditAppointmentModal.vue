<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:px-4"
      @click.self="emit('close')"
    >
      <div
        class="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        @keydown.enter="onEnter"
      >
        <div class="flex items-start justify-between p-5 border-b">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">修改預約</h3>
            <p class="text-sm text-gray-500 mt-1">{{ appointment.service_name }}，{{ appointment.duration }} 分鐘</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600" aria-label="關閉" @click="emit('close')">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <p v-if="appointment.status === 'confirmed'" class="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
            修改日期、時段或美容師後，預約會改回「待確認」
          </p>

          <!-- 美容師 -->
          <div>
            <label class="block text-sm font-medium mb-1">美容師</label>
            <select
              v-model="form.staffId"
              class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option v-for="staff in staffList" :key="staff.id" :value="staff.id">
                {{ staff.name }} ({{ staff.years_experience }}年經驗)
              </option>
            </select>
          </div>

          <!-- 日期 -->
          <div>
            <label class="block text-sm font-medium mb-1">日期</label>
            <input
              v-model="form.date"
              type="date"
              :min="minDate"
              class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- 時段 -->
          <div>
            <label for="edit-time" class="block text-sm font-medium mb-1">時段</label>
            <select
              id="edit-time"
              v-model="form.time"
              :disabled="slotsLoading || !availableSlots.length"
              class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="" disabled>
                {{ slotsLoading ? '載入中…' : availableSlots.length ? '請選擇時段' : '這天沒有空檔，請換一天' }}
              </option>
              <option v-for="slot in availableSlots" :key="slot" :value="slot">{{ slot }}</option>
            </select>
          </div>

          <!-- 姓名 -->
          <div>
            <label class="block text-sm font-medium mb-1">
              姓名 <span class="ml-1 text-xs text-red-500">必填</span>
            </label>
            <input
              v-model="form.customerName"
              type="text"
              placeholder="您的姓名"
              class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :class="{ 'border-red-500': showErrors && !form.customerName.trim() }"
            />
            <p v-if="showErrors && !form.customerName.trim()" class="text-red-500 text-xs mt-1">請填寫姓名</p>
          </div>

          <!-- 電話 -->
          <div>
            <label class="block text-sm font-medium mb-1">
              聯絡電話 <span class="ml-1 text-xs text-red-500">必填</span>
            </label>
            <input
              v-model="form.customerPhone"
              type="tel"
              placeholder="您的聯絡電話"
              class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :class="{ 'border-red-500': showErrors && phoneError }"
            />
            <p v-if="showErrors && phoneError" class="text-red-500 text-xs mt-1">{{ phoneError }}</p>
          </div>

          <!-- 備註 -->
          <div>
            <label class="block text-sm font-medium mb-1">
              備註 <span class="ml-1 text-xs text-gray-400">選填</span>
            </label>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="備註..."
              class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <div class="flex gap-3 p-5 border-t">
          <button
            class="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 transition hover:font-bold"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            class="flex-1 py-2 rounded-lg bg-primary-600 text-white transition disabled:opacity-50 hover:font-bold"
            :disabled="saving"
            @click="save"
          >
            <LoadingSpinner v-if="saving" size="sm" />
            <template v-else>儲存修改</template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useToast } from 'vue-toastification'
import { todayLocal, rejectPastDate, PAST_DATE_MESSAGE } from '@/utils/appointmentTime'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { isValidTaiwanPhone, normalizeTaiwanPhone } from '@/utils/phone'

const props = defineProps<{ appointment: any }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const toast = useToast()

// 資料庫的日期回傳是 ISO 字串，要轉回本地日期 YYYY-MM-DD
const toLocalDate = (value: string) => {
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const minDate = todayLocal()

const form = ref({
  staffId: props.appointment.staff_id as number,
  date: toLocalDate(props.appointment.appointment_date),
  time: (props.appointment.start_time as string)?.slice(0, 5) || '',
  customerName: props.appointment.customer_name || '',
  customerPhone: props.appointment.customer_phone || '',
  notes: props.appointment.notes || ''
})

const staffList = ref<any[]>([])
const availableSlots = ref<string[]>([])
const slotsLoading = ref(false)
const saving = ref(false)
const showErrors = ref(false)

const phoneError = computed(() => {
  if (!form.value.customerPhone.trim()) return '請填寫聯絡電話，方便我們聯繫您'
  if (!isValidTaiwanPhone(form.value.customerPhone)) {
    return '電話格式不正確：手機為 09 開頭共 10 碼，市話請加區碼（例如 02-2345-6789）'
  }
  return ''
})

const loadSlots = async () => {
  if (!form.value.date) return
  slotsLoading.value = true
  try {
    const response = (await apiClient.get('/appointments/available', {
      params: {
        date: form.value.date,
        serviceId: props.appointment.service_id,
        staffId: form.value.staffId,
        // 自己這筆不算占用，原本的時段也能選
        excludeId: props.appointment.id
      }
    })) as any
    if (response.success) {
      availableSlots.value = response.data || []
      // 換了日期或美容師後原本的時段可能沒空了
      if (!availableSlots.value.includes(form.value.time)) form.value.time = ''
    }
  } catch (error: any) {
    toast.error(error?.message || '時段載入失敗')
  } finally {
    slotsLoading.value = false
  }
}

// 選到過去的日期：提醒並退回
watch(
  () => form.value.date,
  (value, previous) => {
    const fallback = rejectPastDate(value, previous)
    if (fallback === null) return
    toast.warning(PAST_DATE_MESSAGE)
    form.value.date = fallback
  }
)

watch(() => [form.value.date, form.value.staffId], loadSlots)

onMounted(async () => {
  loadSlots()
  try {
    const response = (await apiClient.get('/staff')) as any
    if (response.success) {
      staffList.value = response.data || []
    }
  } catch (error) {
    console.error('Failed to load staff:', error)
  }
})

// 在輸入框按 Enter 就儲存；備註欄的 Enter 是換行，按鈕的 Enter 照原本動作
const onEnter = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement
  if (e.isComposing || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return
  e.preventDefault()
  if (!saving.value) save()
}

const save = async () => {
  if (!form.value.date || !form.value.time) {
    toast.warning('請選擇日期和時段')
    return
  }
  if (!form.value.customerName.trim() || phoneError.value) {
    showErrors.value = true
    toast.warning(!form.value.customerName.trim() ? '請填寫姓名' : phoneError.value)
    return
  }

  saving.value = true
  try {
    await apiClient.put(`/appointments/${props.appointment.id}`, {
      staffId: form.value.staffId,
      date: form.value.date,
      time: form.value.time,
      customerName: form.value.customerName,
      customerPhone: normalizeTaiwanPhone(form.value.customerPhone),
      notes: form.value.notes
    })
    toast.success('預約已更新')
    emit('saved')
  } catch (error: any) {
    toast.error(error?.message || '修改失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>
