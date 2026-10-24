<template>
  <div class="space-y-4">
    <form class="admin-panel grid gap-3 p-4 sm:grid-cols-[10rem_1fr_auto] sm:items-start" @submit.prevent="add">
      <div>
        <label class="admin-label" for="closure-date">公休日期</label>
        <input id="closure-date" v-model="form.date" type="date" :min="today" required class="admin-input" />
      </div>
      <div>
        <label class="admin-label" for="closure-reason">原因</label>
        <input id="closure-reason" v-model="form.reason" maxlength="100" placeholder="例如：員工旅遊、農曆春節" class="admin-input" />
        <p class="admin-hint">會顯示在前台預約頁</p>
      </div>
      <button type="submit" class="admin-btn sm:mt-5" :disabled="saving">新增</button>
    </form>
    <p class="text-xs text-gray-500">設為公休後，前台這天不能預約；已經預約的不會自動取消，請記得聯絡顧客</p>

    <div class="admin-panel overflow-x-auto">
      <table class="admin-table min-w-[560px]">
        <thead>
          <tr>
            <th>日期</th>
            <th>原因</th>
            <th class="text-right">當天預約</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="4" class="py-12"><LoadingSpinner /></td></tr>
          <tr v-else-if="!rows.length"><td colspan="4" class="py-12 text-center text-gray-400">近期沒有公休日</td></tr>
          <tr v-for="r in rows" v-else :key="r.closure_date">
            <td class="whitespace-nowrap tabular-nums">{{ r.closure_date }}（{{ weekday(r.closure_date) }}）</td>
            <td class="text-gray-600">{{ r.reason || '—' }}</td>
            <td class="text-right tabular-nums" :class="{ 'font-medium text-red-600': Number(r.appointment_count) }">
              {{ r.appointment_count }}
            </td>
            <td class="text-right">
              <button type="button" class="text-sm text-red-600 hover:text-red-800" @click="remove(r)">取消公休</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const toast = useToast()
const today = new Date().toLocaleDateString('sv-SE')
const rows = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const form = ref({ date: '', reason: '' })

const weekday = (date: string) => `週${WEEKDAYS[new Date(`${date}T00:00:00`).getDay()]}`

const load = async () => {
  try {
    const res = await apiClient.get('/admin/closures') as any
    rows.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '公休日載入失敗')
  } finally {
    loading.value = false
  }
}

const add = async () => {
  saving.value = true
  try {
    const res = await apiClient.post('/admin/closures', form.value) as any
    // 當天還有預約時用警告提醒
    if (res.message.includes('記得')) toast.warning(res.message)
    else toast.success(res.message)
    form.value = { date: '', reason: '' }
    await load()
  } catch (error: any) {
    toast.error(error?.message || '新增失敗')
  } finally {
    saving.value = false
  }
}

const remove = async (r: any) => {
  try {
    await apiClient.delete(`/admin/closures/${r.closure_date}`)
    toast.success('已取消公休')
    await load()
  } catch (error: any) {
    toast.error(error?.message || '取消失敗')
  }
}

onMounted(load)
</script>
