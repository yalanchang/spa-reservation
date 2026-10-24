<template>
  <AdminModal :open="open" title="新增預約（電話／現場）" wide @close="emit('close')">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <div>
        <label class="admin-label" for="ab-name">顧客姓名</label>
        <input id="ab-name" v-model="form.customerName" required maxlength="100" class="admin-input" />
      </div>
      <div>
        <label class="admin-label" for="ab-phone">電話</label>
        <input id="ab-phone" v-model="form.customerPhone" type="tel" required class="admin-input" />
        <p class="admin-hint">與會員電話相同時會自動連結到會員</p>
      </div>
      <div>
        <label class="admin-label" for="ab-service">療程</label>
        <select id="ab-service" v-model="form.serviceId" required class="admin-input">
          <option :value="null" disabled>請選擇</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.category_name }}｜{{ s.name }}（{{ s.duration }} 分）</option>
        </select>
      </div>
      <div>
        <label class="admin-label" for="ab-staff">美容師</label>
        <select id="ab-staff" v-model="form.staffId" class="admin-input">
          <option :value="null">不指定（系統安排）</option>
          <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="admin-label" for="ab-date">日期</label>
        <input id="ab-date" v-model="form.date" type="date" :min="today" required class="admin-input" />
      </div>
      <div>
        <label class="admin-label" for="ab-time">時段</label>
        <select id="ab-time" v-model="form.time" required class="admin-input" :disabled="slotsLoading || !slots.length">
          <option value="" disabled>{{ slotHint }}</option>
          <option v-for="t in slots" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <div>
        <label class="admin-label" for="ab-source">來源</label>
        <select id="ab-source" v-model="form.source" class="admin-input">
          <option value="phone">電話</option>
          <option value="walk_in">現場</option>
          <option value="line">LINE</option>
        </select>
      </div>
      <div>
        <label class="admin-label" for="ab-notes">備註</label>
        <input id="ab-notes" v-model="form.notes" maxlength="500" class="admin-input" />
      </div>
      <p class="text-xs text-gray-500 sm:col-span-2">後台建立的預約直接是「已確認」</p>
      <div class="flex justify-end gap-2 sm:col-span-2">
        <button type="button" class="admin-btn-outline" @click="emit('close')">取消</button>
        <button type="submit" class="admin-btn" :disabled="saving || !form.time">
          <LoadingSpinner v-if="saving" size="sm" />
          <template v-else>建立預約</template>
        </button>
      </div>
    </form>
  </AdminModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { isValidTaiwanPhone } from '@/utils/phone'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminModal from '@/components/admin/AdminModal.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [] }>()

const toast = useToast()
const today = new Date().toLocaleDateString('sv-SE')

const services = ref<any[]>([])
const staff = ref<any[]>([])
const slots = ref<string[]>([])
const slotsLoading = ref(false)
const saving = ref(false)

const empty = () => ({
  customerName: '', customerPhone: '', serviceId: null as number | null, staffId: null as number | null,
  date: today, time: '', source: 'phone', notes: ''
})
const form = ref(empty())

const slotHint = computed(() => {
  if (!form.value.serviceId) return '先選療程'
  if (slotsLoading.value) return '載入中…'
  return slots.value.length ? '請選擇' : '這天沒有空檔'
})

watch(() => props.open, async (open) => {
  if (!open) return
  form.value = empty()
  if (services.value.length) return
  try {
    const [svc, st] = await Promise.all([apiClient.get('/admin/services'), apiClient.get('/admin/staff')]) as any[]
    services.value = (svc.data || []).filter((s: any) => Number(s.is_active))
    staff.value = (st.data || []).filter((s: any) => Number(s.is_active))
  } catch (error: any) {
    toast.error(error?.message || '資料載入失敗')
  }
})

watch(() => [form.value.serviceId, form.value.staffId, form.value.date], async () => {
  form.value.time = ''
  slots.value = []
  if (!form.value.serviceId || !form.value.date) return
  slotsLoading.value = true
  try {
    const res = await apiClient.get('/admin/appointments/slots', {
      params: { date: form.value.date, serviceId: form.value.serviceId, staffId: form.value.staffId || undefined }
    }) as any
    slots.value = res.data || []
  } finally {
    slotsLoading.value = false
  }
})

const submit = async () => {
  if (!isValidTaiwanPhone(form.value.customerPhone)) {
    toast.warning('電話格式不正確')
    return
  }
  saving.value = true
  try {
    const res = await apiClient.post('/admin/appointments', form.value) as any
    toast.success(res.message)
    emit('created')
  } catch (error: any) {
    toast.error(error?.message || '建立失敗')
  } finally {
    saving.value = false
  }
}
</script>
