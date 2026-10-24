<template>
  <div class="space-y-4">
    <form
      class="admin-panel grid gap-3 p-4 lg:grid-cols-[1fr_9.5rem_9.5rem_5rem_auto] lg:items-start"
      @submit.prevent="save"
    >
      <div>
        <label class="admin-label" for="ann-content">{{ form.id ? '編輯公告' : '新增公告' }}</label>
        <input
          id="ann-content"
          v-model="form.content"
          required
          maxlength="40"
          class="admin-input"
          placeholder="例如：週年慶全館 9 折"
        />
        <p class="admin-hint">40 字以內，首頁跑馬燈一次顯示一則</p>
      </div>
      <div>
        <label class="admin-label" for="ann-start">開始日期</label>
        <input id="ann-start" v-model="form.startDate" type="date" class="admin-input" />
      </div>
      <div>
        <label class="admin-label" for="ann-end">結束日期</label>
        <input id="ann-end" v-model="form.endDate" type="date" class="admin-input" />
      </div>
      <div>
        <label class="admin-label" for="ann-sort">排序</label>
        <input id="ann-sort" v-model.number="form.sortOrder" type="number" class="admin-input" />
      </div>
      <div class="flex gap-2 lg:mt-5">
        <button v-if="form.id" type="button" class="admin-btn-outline" @click="reset">取消</button>
        <button type="submit" class="admin-btn" :disabled="saving">{{ form.id ? '儲存' : '新增' }}</button>
      </div>
    </form>

    <div class="admin-panel overflow-x-auto">
      <table class="admin-table min-w-[680px]">
        <thead>
          <tr>
            <th class="w-16">排序</th>
            <th>內容</th>
            <th>顯示期間</th>
            <th>狀態</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="py-12"><LoadingSpinner /></td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="5" class="py-12 text-center text-gray-400">還沒有公告，首頁不會顯示跑馬燈</td>
          </tr>
          <tr v-for="r in rows" v-else :key="r.id">
            <td class="tabular-nums text-gray-500">{{ r.sort_order }}</td>
            <td class="text-gray-900">{{ r.content }}</td>
            <td class="whitespace-nowrap tabular-nums text-gray-600">
              {{ r.start_date || r.end_date ? `${r.start_date || '即日起'} ~ ${r.end_date || '不限'}` : '不限' }}
            </td>
            <td>
              <span class="admin-tag" :class="state(r).class">{{ state(r).label }}</span>
            </td>
            <td class="whitespace-nowrap text-right">
              <button type="button" class="admin-link" @click="edit(r)">編輯</button>
              <button type="button" class="admin-link ml-3" @click="toggle(r)">
                {{ Number(r.is_active) ? '隱藏' : '顯示' }}
              </button>
              <button type="button" class="ml-3 text-sm text-red-600 hover:text-red-800" @click="remove(r)">
                刪除
              </button>
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
import { useConfirm } from '@/composables/useConfirm'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const toast = useToast()
const confirm = useConfirm()
const today = new Date().toLocaleDateString('sv-SE')

const rows = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const empty = () => ({ id: 0, content: '', startDate: '', endDate: '', sortOrder: 0, isActive: true })
const form = ref(empty())

const state = (r: any) => {
  if (!Number(r.is_active)) return { label: '隱藏', class: 'bg-gray-100 text-gray-500' }
  if (r.end_date && r.end_date < today) return { label: '已結束', class: 'bg-gray-100 text-gray-500' }
  if (r.start_date && r.start_date > today) return { label: '排程中', class: 'bg-amber-50 text-amber-700' }
  return { label: '顯示中', class: 'bg-green-50 text-green-700' }
}

const load = async () => {
  try {
    const res = (await apiClient.get('/admin/announcements')) as any
    rows.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '公告載入失敗')
  } finally {
    loading.value = false
  }
}

const toBody = (r: any) => ({
  content: r.content,
  startDate: r.start_date || '',
  endDate: r.end_date || '',
  sortOrder: r.sort_order,
  isActive: !!Number(r.is_active)
})

const reset = () => {
  form.value = empty()
}
const edit = (r: any) => {
  form.value = { id: r.id, ...toBody(r) }
}

const save = async () => {
  saving.value = true
  try {
    const { id, ...body } = form.value
    if (id) await apiClient.put(`/admin/announcements/${id}`, body)
    else await apiClient.post('/admin/announcements', body)
    toast.success('公告已儲存')
    reset()
    await load()
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const toggle = async (r: any) => {
  try {
    await apiClient.put(`/admin/announcements/${r.id}`, { ...toBody(r), isActive: !Number(r.is_active) })
    await load()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗')
  }
}

const remove = async (r: any) => {
  const ok = await confirm({ title: '確定要刪除這則公告嗎？', message: r.content, confirmText: '刪除', danger: true })
  if (!ok) return
  try {
    await apiClient.delete(`/admin/announcements/${r.id}`)
    toast.success('已刪除')
    await load()
  } catch (error: any) {
    toast.error(error?.message || '刪除失敗')
  }
}

onMounted(load)
</script>
