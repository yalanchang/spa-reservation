<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model.trim="keyword"
        type="search"
        placeholder="搜尋姓名、信箱、電話"
        class="admin-input sm:!w-64"
        @keyup.enter="load"
      />
      <select v-model="status" class="admin-input !w-auto" aria-label="狀態" @change="load">
        <option value="active">正常</option>
        <option value="inactive">已停權</option>
        <option value="all">全部</option>
      </select>
      <select v-model="sort" class="admin-input !w-auto" aria-label="排序" @change="load">
        <option value="recent">最新加入</option>
        <option value="spend">累積消費高→低</option>
        <option value="visits">到店次數多→少</option>
        <option value="last">最近到店</option>
      </select>
      <button type="button" class="admin-btn-outline" @click="load">搜尋</button>
      <span class="ml-auto text-sm text-gray-500">共 {{ customers.length }} 位</span>
    </div>

    <div class="admin-panel overflow-x-auto">
      <table v-stack-table class="admin-table min-w-[820px]">
        <thead>
          <tr>
            <th>會員</th>
            <th>電話</th>
            <th class="text-right">到店次數</th>
            <th class="text-right">累積消費</th>
            <th class="text-right">未到店</th>
            <th>最近到店</th>
            <th>加入日期</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="py-12"><LoadingSpinner /></td>
          </tr>
          <tr v-else-if="!customers.length">
            <td colspan="8" class="py-12 text-center text-gray-400">沒有符合的會員</td>
          </tr>
          <tr v-for="c in customers" v-else :key="c.id">
            <td>
              <p class="font-medium text-gray-900">
                {{ c.name }}
                <span v-if="!Number(c.is_active)" class="admin-tag ml-1 bg-red-50 text-red-600">停權</span>
              </p>
              <p class="text-xs text-gray-500">{{ c.email }}</p>
            </td>
            <td class="tabular-nums text-gray-600">{{ c.phone || '—' }}</td>
            <td class="text-right tabular-nums">{{ c.visit_count }}</td>
            <td class="text-right tabular-nums">{{ Number(c.total_spend).toLocaleString() }}</td>
            <td class="text-right tabular-nums" :class="{ 'text-red-600': Number(c.no_show_count) }">
              {{ c.no_show_count }}
            </td>
            <td class="tabular-nums text-gray-600">{{ c.last_visit || '—' }}</td>
            <td class="tabular-nums text-gray-600">{{ formatDate(c.created_at) }}</td>
            <td class="text-right"><button type="button" class="admin-link" @click="openDetail(c.id)">查看</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 會員詳情 -->
    <AdminModal :open="!!detail || detailLoading" :title="detail?.name || '會員資料'" wide @close="detail = null">
      <div v-if="detailLoading" class="py-10"><LoadingSpinner /></div>
      <div v-else-if="detail" class="space-y-5">
        <dl class="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <div v-for="item in detailFields" :key="item.label">
            <dt class="text-xs text-gray-500">{{ item.label }}</dt>
            <dd class="mt-0.5 text-gray-900">{{ item.value || '—' }}</dd>
          </div>
        </dl>

        <div v-if="detail.care_notes" class="rounded-md bg-amber-50 px-4 py-3 text-amber-800">
          <span class="font-medium">過敏或注意事項：</span>{{ detail.care_notes }}
        </div>

        <div>
          <label class="admin-label" for="customer-note">店內備註</label>
          <textarea
            id="customer-note"
            v-model="note"
            rows="3"
            maxlength="1000"
            class="admin-input"
            placeholder="例如：偏好安靜、怕癢、常改期"
          ></textarea>
          <p class="admin-hint">只有後台看得到</p>
          <div class="mt-2 flex justify-end">
            <button
              type="button"
              class="admin-btn"
              :disabled="savingNote || note === (detail.admin_note || '')"
              @click="saveNote"
            >
              <LoadingSpinner v-if="savingNote" size="sm" />
              <template v-else>儲存備註</template>
            </button>
          </div>
        </div>

        <div>
          <h4 class="mb-2 text-sm font-medium text-gray-900">預約紀錄（{{ detail.appointments.length }}）</h4>
          <!-- 一筆一列：上面時間與狀態，下面療程、美容師、金額；手機也不會擠成直排 -->
          <ul class="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
            <li v-if="!detail.appointments.length" class="py-6 text-center text-gray-400">還沒有預約</li>
            <li v-for="a in detail.appointments" :key="a.id" class="px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <span class="tabular-nums text-gray-900">{{ a.appointment_date }} {{ a.start_time.slice(0, 5) }}</span>
                <span class="admin-tag shrink-0" :class="STATUS_CLASSES[a.status]">{{ STATUS_LABELS[a.status] }}</span>
              </div>
              <div class="mt-1 flex items-center justify-between gap-3 text-gray-500">
                <span class="min-w-0 truncate">{{ a.service_name }}・{{ a.staff_name }}</span>
                <span class="shrink-0 tabular-nums">
                  <span v-if="a.rating" class="mr-2 text-amber-500" :aria-label="`${a.rating} 星`">{{
                    '★'.repeat(a.rating)
                  }}</span>
                  NT$ {{ Number(a.price).toLocaleString() }}
                </span>
              </div>
            </li>
          </ul>
        </div>

        <div
          v-if="authStore.user?.role === 'admin'"
          class="flex items-center justify-between gap-4 border-t border-gray-200 pt-4"
        >
          <p class="text-xs text-gray-500">停權後對方無法登入，已有的預約不受影響</p>
          <button
            type="button"
            class="text-sm"
            :class="Number(detail.is_active) ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-800'"
            @click="toggleActive"
          >
            {{ Number(detail.is_active) ? '停權' : '恢復帳號' }}
          </button>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useConfirm } from '@/composables/useConfirm'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import { STATUS_LABELS, STATUS_CLASSES } from '@/utils/appointmentStatus'

const GENDERS: Record<string, string> = { female: '女', male: '男', other: '不透露' }
const SKIN_TYPES: Record<string, string> = {
  dry: '乾性',
  oily: '油性',
  combination: '混合性',
  normal: '中性',
  sensitive: '敏感性'
}

const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()

const customers = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('active')
const sort = ref('recent')

const formatDate = (value: string) => new Date(value).toLocaleDateString('sv-SE')

const load = async () => {
  loading.value = true
  try {
    const res = (await apiClient.get('/admin/customers', {
      params: { q: keyword.value, status: status.value, sort: sort.value }
    })) as any
    customers.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '會員載入失敗')
  } finally {
    loading.value = false
  }
}

// ---- 詳情
const detail = ref<any | null>(null)
const detailLoading = ref(false)
const note = ref('')
const savingNote = ref(false)

const detailFields = computed(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: '電子郵件', value: d.email },
    { label: '電話', value: d.phone },
    { label: '生日', value: d.birthday },
    { label: '性別', value: GENDERS[d.gender] },
    { label: '縣市', value: d.city },
    { label: '膚質', value: SKIN_TYPES[d.skin_type] },
    { label: '指定美容師', value: d.preferred_staff },
    { label: '接收優惠', value: Number(d.marketing_opt_in) ? '是' : '否' },
    { label: '加入日期', value: formatDate(d.created_at) }
  ]
})

const openDetail = async (id: number) => {
  detailLoading.value = true
  try {
    const res = (await apiClient.get(`/admin/customers/${id}`)) as any
    detail.value = res.data
    note.value = res.data.admin_note || ''
  } catch (error: any) {
    toast.error(error?.message || '會員資料載入失敗')
  } finally {
    detailLoading.value = false
  }
}

const saveNote = async () => {
  savingNote.value = true
  try {
    await apiClient.put(`/admin/customers/${detail.value.id}/note`, { note: note.value })
    detail.value.admin_note = note.value
    toast.success('備註已儲存')
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  } finally {
    savingNote.value = false
  }
}

const toggleActive = async () => {
  const active = !Number(detail.value.is_active)
  if (!active) {
    const ok = await confirm({
      title: `確定要停權 ${detail.value.name} 嗎？`,
      message: '停權後對方無法登入',
      confirmText: '停權',
      danger: true
    })
    if (!ok) return
  }
  try {
    const res = (await apiClient.patch(`/admin/customers/${detail.value.id}/active`, { active })) as any
    toast.success(res.message)
    detail.value.is_active = active ? 1 : 0
    await load()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗')
  }
}

onMounted(load)
</script>
