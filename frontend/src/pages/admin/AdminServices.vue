<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <select v-model="categoryFilter" class="admin-input !w-auto" aria-label="分類">
        <option :value="0">全部分類</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="activeFilter" class="admin-input !w-auto" aria-label="狀態">
        <option value="">全部狀態</option>
        <option value="1">上架中</option>
        <option value="0">已下架</option>
      </select>
      <input v-model.trim="keyword" type="search" placeholder="搜尋療程名稱" class="admin-input sm:!w-56" />
      <div class="ml-auto flex gap-2">
        <button type="button" class="admin-btn-outline" @click="categoryModal = true">管理分類</button>
        <button type="button" class="admin-btn" @click="openService()">新增療程</button>
      </div>
    </div>

    <div class="admin-panel overflow-x-auto">
      <table class="admin-table min-w-[820px]">
        <thead>
          <tr>
            <th>療程</th>
            <th>分類</th>
            <th class="text-right">價格</th>
            <th class="text-right">時長</th>
            <th class="text-right">完成次數</th>
            <th class="text-right">評分</th>
            <th>狀態</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="py-12"><LoadingSpinner /></td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="8" class="py-12 text-center text-gray-400">沒有符合的療程</td>
          </tr>
          <tr v-for="s in filtered" v-else :key="s.id">
            <td>
              <p class="font-medium text-gray-900">{{ s.name }}</p>
              <p class="max-w-xs truncate text-xs text-gray-500">{{ s.description }}</p>
            </td>
            <td class="text-gray-600">{{ s.category_name }}</td>
            <td class="text-right tabular-nums">{{ Number(s.price).toLocaleString() }}</td>
            <td class="text-right tabular-nums">{{ s.duration }} 分</td>
            <td class="text-right tabular-nums">{{ s.completed_count }}</td>
            <td class="text-right tabular-nums">{{ s.average_rating ?? '—' }}</td>
            <td>
              <span
                class="admin-tag"
                :class="Number(s.is_active) ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ Number(s.is_active) ? '上架中' : '已下架' }}
              </span>
            </td>
            <td class="whitespace-nowrap text-right">
              <button type="button" class="admin-link" @click="openService(s)">編輯</button>
              <button type="button" class="admin-link ml-3" :disabled="togglingId === s.id" @click="toggleActive(s)">
                {{ Number(s.is_active) ? '下架' : '上架' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-gray-500">下架的療程前台不會顯示，已經預約的不受影響</p>

    <!-- 療程表單 -->
    <AdminModal
      :open="!!serviceForm"
      :title="serviceForm?.id ? '編輯療程' : '新增療程'"
      wide
      @close="serviceForm = null"
    >
      <form v-if="serviceForm" class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveService">
        <div class="sm:col-span-2">
          <label class="admin-label" for="svc-name">療程名稱</label>
          <input id="svc-name" v-model="serviceForm.name" required maxlength="200" class="admin-input" />
        </div>
        <div>
          <label class="admin-label" for="svc-category">分類</label>
          <select id="svc-category" v-model="serviceForm.categoryId" required class="admin-input">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="admin-label" for="svc-sort">排序</label>
          <input id="svc-sort" v-model.number="serviceForm.sortOrder" type="number" class="admin-input" />
          <p class="admin-hint">數字越小越前面</p>
        </div>
        <div>
          <label class="admin-label" for="svc-price">價格</label>
          <div class="admin-input-group">
            <span>NT$</span>
            <input id="svc-price" v-model.number="serviceForm.price" type="number" min="0" step="1" required />
          </div>
        </div>
        <div>
          <label class="admin-label" for="svc-duration">時長</label>
          <select id="svc-duration" v-model.number="serviceForm.duration" class="admin-input">
            <option v-for="m in DURATIONS" :key="m" :value="m">{{ m }} 分鐘</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="admin-label" for="svc-desc">介紹</label>
          <textarea id="svc-desc" v-model="serviceForm.description" rows="3" class="admin-input"></textarea>
        </div>
        <div class="flex justify-end gap-2 sm:col-span-2">
          <button type="button" class="admin-btn-outline" @click="serviceForm = null">取消</button>
          <button type="submit" class="admin-btn" :disabled="saving">
            <LoadingSpinner v-if="saving" size="sm" />
            <template v-else>儲存</template>
          </button>
        </div>
      </form>
    </AdminModal>

    <!-- 分類 -->
    <AdminModal :open="categoryModal" title="管理分類" wide @close="closeCategoryModal">
      <table class="admin-table">
        <thead>
          <tr>
            <th>名稱</th>
            <th class="w-24">排序</th>
            <th class="w-20 text-right">療程數</th>
            <th class="w-20 text-right"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categoryRows" :key="c.id ?? 'new'">
            <td><input v-model="c.name" class="admin-input" :placeholder="c.id ? '' : '新分類名稱'" /></td>
            <td><input v-model.number="c.sort_order" type="number" class="admin-input" /></td>
            <td class="text-right tabular-nums text-gray-500">{{ c.id ? c.service_count : '' }}</td>
            <td class="text-right">
              <button type="button" class="admin-link" :disabled="!c.name?.trim()" @click="saveCategory(c)">
                {{ c.id ? '儲存' : '新增' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useServicesStore } from '@/stores/services'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminModal from '@/components/admin/AdminModal.vue'

const DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180]

const toast = useToast()
const servicesStore = useServicesStore()

const services = ref<any[]>([])
const categories = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const togglingId = ref<number | null>(null)

const categoryFilter = ref(0)
const activeFilter = ref('')
const keyword = ref('')

const filtered = computed(() =>
  services.value.filter(
    (s) =>
      (!categoryFilter.value || s.category_id === categoryFilter.value) &&
      (!activeFilter.value || String(Number(s.is_active)) === activeFilter.value) &&
      (!keyword.value || s.name.includes(keyword.value))
  )
)

const load = async () => {
  try {
    const [svc, cat] = (await Promise.all([
      apiClient.get('/admin/services'),
      apiClient.get('/admin/categories')
    ])) as any[]
    services.value = svc.data || []
    categories.value = cat.data || []
  } catch (error: any) {
    toast.error(error?.message || '資料載入失敗')
  } finally {
    loading.value = false
  }
}

// 前台的療程清單有快取，後台改完要讓前台重新抓
const refreshStorefront = () => servicesStore.fetchServices().catch(() => {})

// ---- 療程
const serviceForm = ref<any | null>(null)

const openService = (s?: any) => {
  serviceForm.value = s
    ? {
        id: s.id,
        name: s.name,
        categoryId: s.category_id,
        price: Number(s.price),
        duration: s.duration,
        sortOrder: s.sort_order,
        description: s.description || ''
      }
    : { name: '', categoryId: categories.value[0]?.id, price: 1000, duration: 60, sortOrder: 0, description: '' }
}

const saveService = async () => {
  saving.value = true
  try {
    const { id, ...body } = serviceForm.value
    if (id) await apiClient.put(`/admin/services/${id}`, body)
    else await apiClient.post('/admin/services', body)
    toast.success('療程已儲存')
    serviceForm.value = null
    await load()
    refreshStorefront()
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (s: any) => {
  togglingId.value = s.id
  try {
    const res = (await apiClient.patch(`/admin/services/${s.id}/active`, { active: !Number(s.is_active) })) as any
    toast.success(res.message)
    await load()
    refreshStorefront()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗')
  } finally {
    togglingId.value = null
  }
}

// ---- 分類
const categoryModal = ref(false)
const newCategory = ref({ id: null, name: '', sort_order: 0, service_count: 0 })
const categoryRows = computed(() => [...categories.value, newCategory.value])

const saveCategory = async (c: any) => {
  try {
    const body = { name: c.name, description: c.description, sortOrder: c.sort_order }
    if (c.id) await apiClient.put(`/admin/categories/${c.id}`, body)
    else await apiClient.post('/admin/categories', body)
    toast.success('分類已儲存')
    newCategory.value = { id: null, name: '', sort_order: 0, service_count: 0 }
    await load()
    servicesStore.fetchCategories().catch(() => {})
  } catch (error: any) {
    toast.error(error?.message || '儲存失敗')
  }
}

const closeCategoryModal = () => {
  categoryModal.value = false
  load()
}

onMounted(load)
</script>
