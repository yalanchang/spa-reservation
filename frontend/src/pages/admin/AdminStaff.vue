<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">班表與請假會直接影響前台可以預約的時段</p>
      <button type="button" class="admin-btn" @click="openProfile()">新增美容師</button>
    </div>

    <div class="admin-panel overflow-x-auto">
      <table class="admin-table min-w-[760px]">
        <thead>
          <tr>
            <th>美容師</th>
            <th>上班日</th>
            <th class="text-right">年資</th>
            <th class="text-right">今日預約</th>
            <th class="text-right">評分</th>
            <th>狀態</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="py-12"><LoadingSpinner /></td></tr>
          <tr v-for="s in staff" v-else :key="s.id">
            <td>
              <p class="font-medium text-gray-900">{{ s.name }}</p>
              <p class="text-xs text-gray-500">{{ s.title }}</p>
            </td>
            <td>
              <div class="flex gap-1">
                <span
                  v-for="(label, day) in WEEKDAYS"
                  :key="day"
                  class="flex h-6 w-6 items-center justify-center rounded text-xs"
                  :class="s.working_days.includes(day) ? 'bg-blue-50 text-blue-700' : 'text-gray-300'"
                >{{ label }}</span>
              </div>
            </td>
            <td class="text-right tabular-nums">{{ s.years_experience ?? 0 }} 年</td>
            <td class="text-right tabular-nums">{{ s.today_count }}</td>
            <td class="text-right tabular-nums">{{ s.average_rating ?? '—' }}</td>
            <td>
              <span class="admin-tag" :class="Number(s.is_active) ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'">
                {{ Number(s.is_active) ? '在職' : '停用' }}
              </span>
            </td>
            <td class="whitespace-nowrap text-right">
              <button type="button" class="admin-link" @click="openSchedule(s)">班表與請假</button>
              <button type="button" class="admin-link ml-3" @click="openProfile(s)">資料</button>
              <button type="button" class="admin-link ml-3" @click="toggleActive(s)">{{ Number(s.is_active) ? '停用' : '啟用' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 基本資料 -->
    <AdminModal :open="!!profileForm" :title="profileForm?.id ? '編輯美容師' : '新增美容師'" @close="profileForm = null">
      <form v-if="profileForm" class="space-y-4" @submit.prevent="saveProfile">
        <div>
          <label class="admin-label" for="staff-name">姓名</label>
          <input id="staff-name" v-model="profileForm.name" required maxlength="100" class="admin-input" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="admin-label" for="staff-title">職稱</label>
            <input id="staff-title" v-model="profileForm.title" maxlength="100" class="admin-input" />
          </div>
          <div>
            <label class="admin-label" for="staff-years">年資</label>
            <input id="staff-years" v-model.number="profileForm.yearsExperience" type="number" min="0" max="60" class="admin-input" />
          </div>
        </div>
        <div>
          <label class="admin-label" for="staff-bio">專長介紹</label>
          <textarea id="staff-bio" v-model="profileForm.bio" rows="3" class="admin-input"></textarea>
          <p class="admin-hint">會顯示在前台</p>
        </div>
        <p v-if="!profileForm.id" class="text-xs text-gray-500">新增後會先套用預設班表（週一休），可再到「班表與請假」調整</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="admin-btn-outline" @click="profileForm = null">取消</button>
          <button type="submit" class="admin-btn" :disabled="saving">
            <LoadingSpinner v-if="saving" size="sm" />
            <template v-else>儲存</template>
          </button>
        </div>
      </form>
    </AdminModal>

    <!-- 班表與請假 -->
    <AdminModal :open="!!scheduleStaff" :title="`${scheduleStaff?.name || ''} 的班表與請假`" wide @close="scheduleStaff = null">
      <div v-if="scheduleLoading" class="py-10"><LoadingSpinner /></div>
      <div v-else class="space-y-6">
        <section>
          <h4 class="mb-2 text-sm font-medium text-gray-900">每週班表</h4>
          <table class="admin-table">
            <tbody>
              <tr v-for="d in schedule" :key="d.day">
                <td class="w-16">週{{ WEEKDAYS[d.day] }}</td>
                <td class="w-24">
                  <label class="flex items-center gap-2">
                    <input v-model="d.working" type="checkbox" class="h-4 w-4 accent-blue-600" />
                    {{ d.working ? '上班' : '休假' }}
                  </label>
                </td>
                <td>
                  <div v-if="d.working" class="flex items-center gap-2">
                    <input v-model="d.start" type="time" step="1800" class="admin-input !w-32" :aria-label="`週${WEEKDAYS[d.day]}上班時間`" />
                    <span class="text-gray-400">–</span>
                    <input v-model="d.end" type="time" step="1800" class="admin-input !w-32" :aria-label="`週${WEEKDAYS[d.day]}下班時間`" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mt-3 flex justify-end">
            <button type="button" class="admin-btn" :disabled="saving" @click="saveSchedule">
              <LoadingSpinner v-if="saving" size="sm" />
              <template v-else>儲存班表</template>
            </button>
          </div>
        </section>

        <section class="border-t border-gray-200 pt-5">
          <h4 class="mb-2 text-sm font-medium text-gray-900">請假</h4>
          <form class="grid gap-3 sm:grid-cols-[9.5rem_auto_1fr_auto] sm:items-end" @submit.prevent="addLeave">
            <div>
              <label class="admin-label" for="leave-date">日期</label>
              <input id="leave-date" v-model="leaveForm.date" type="date" :min="today" required class="admin-input" />
            </div>
            <div>
              <label class="admin-label" for="leave-type">時段</label>
              <div class="flex items-center gap-2">
                <select id="leave-type" v-model="leaveForm.fullDay" class="admin-input !w-24">
                  <option :value="true">整天</option>
                  <option :value="false">部分</option>
                </select>
                <template v-if="!leaveForm.fullDay">
                  <input v-model="leaveForm.start" type="time" step="1800" class="admin-input !w-28" aria-label="請假開始" />
                  <input v-model="leaveForm.end" type="time" step="1800" class="admin-input !w-28" aria-label="請假結束" />
                </template>
              </div>
            </div>
            <div>
              <label class="admin-label" for="leave-reason">原因</label>
              <input id="leave-reason" v-model="leaveForm.reason" maxlength="255" placeholder="選填" class="admin-input" />
            </div>
            <button type="submit" class="admin-btn">新增</button>
          </form>

          <ul class="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200">
            <li v-if="!leaves.length" class="px-4 py-6 text-center text-gray-400">沒有排定的請假</li>
            <li v-for="l in leaves" :key="l.id" class="flex items-center gap-3 px-4 py-2.5">
              <span class="tabular-nums">{{ l.leave_date }}（週{{ WEEKDAYS[new Date(`${l.leave_date}T00:00:00`).getDay()] }}）</span>
              <span class="text-gray-500">{{ Number(l.is_full_day) ? '整天' : `${l.start_time}–${l.end_time}` }}</span>
              <span class="flex-1 truncate text-gray-500">{{ l.reason }}</span>
              <button type="button" class="text-sm text-red-600 hover:text-red-800" @click="deleteLeave(l)">刪除</button>
            </li>
          </ul>
        </section>
      </div>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useConfirm } from '@/composables/useConfirm'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminModal from '@/components/admin/AdminModal.vue'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const toast = useToast()
const confirm = useConfirm()
const today = new Date().toLocaleDateString('sv-SE')

const staff = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)

const load = async () => {
  try {
    const res = await apiClient.get('/admin/staff') as any
    staff.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '資料載入失敗')
  } finally {
    loading.value = false
  }
}

// ---- 基本資料
const profileForm = ref<any | null>(null)

const openProfile = (s?: any) => {
  profileForm.value = s
    ? { id: s.id, name: s.name, title: s.title || '', bio: s.bio || '', yearsExperience: s.years_experience || 0 }
    : { name: '', title: '美容師', bio: '', yearsExperience: 0 }
}

const saveProfile = async () => {
  saving.value = true
  try {
    const { id, ...body } = profileForm.value
    if (id) await apiClient.put(`/admin/staff/${id}`, body)
    else await apiClient.post('/admin/staff', body)
    toast.success('已儲存')
    profileForm.value = null
    await load()
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (s: any) => {
  const active = !Number(s.is_active)
  if (!active) {
    const ok = await confirm({ title: `確定要停用 ${s.name} 嗎？`, message: '停用後前台不能再選這位美容師', confirmText: '停用', danger: true })
    if (!ok) return
  }
  try {
    const res = await apiClient.patch(`/admin/staff/${s.id}/active`, { active }) as any
    toast.success(res.message)
    await load()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗')
  }
}

// ---- 班表與請假
const scheduleStaff = ref<any | null>(null)
const scheduleLoading = ref(false)
const schedule = ref<any[]>([])
const leaves = ref<any[]>([])
const leaveForm = ref({ date: '', fullDay: true, start: '13:00', end: '18:00', reason: '' })

const loadSchedule = async () => {
  const res = await apiClient.get(`/admin/staff/${scheduleStaff.value.id}/schedule`) as any
  schedule.value = res.data.schedule
  leaves.value = res.data.leaves
}

const openSchedule = async (s: any) => {
  scheduleStaff.value = s
  scheduleLoading.value = true
  try {
    await loadSchedule()
  } catch (error: any) {
    toast.error(error?.message || '班表載入失敗')
  } finally {
    scheduleLoading.value = false
  }
}

const saveSchedule = async () => {
  saving.value = true
  try {
    const res = await apiClient.put(`/admin/staff/${scheduleStaff.value.id}/schedule`, { schedule: schedule.value }) as any
    toast.success(res.message)
    await load()
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const addLeave = async () => {
  try {
    await apiClient.post(`/admin/staff/${scheduleStaff.value.id}/leaves`, leaveForm.value)
    toast.success('已新增請假')
    leaveForm.value = { ...leaveForm.value, date: '', reason: '' }
    await loadSchedule()
  } catch (error: any) {
    toast.error(error?.message || '新增失敗')
  }
}

const deleteLeave = async (l: any) => {
  try {
    await apiClient.delete(`/admin/leaves/${l.id}`)
    toast.success('已刪除')
    await loadSchedule()
  } catch (error: any) {
    toast.error(error?.message || '刪除失敗')
  }
}

onMounted(load)
</script>
