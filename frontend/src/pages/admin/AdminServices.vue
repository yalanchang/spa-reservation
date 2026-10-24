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
            <th class="w-12"><span class="sr-only">排序</span></th>
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
        <tbody ref="serviceBody">
          <tr v-if="loading">
            <td colspan="9" class="py-12"><LoadingSpinner /></td>
          </tr>
          <tr v-else-if="!filtered.length">
            <td colspan="9" class="py-12 text-center text-gray-400">沒有符合的療程</td>
          </tr>
          <tr v-for="s in filtered" v-else :key="s.id" data-sortable :data-id="s.id" :data-category="s.category_id">
            <td class="!px-2">
              <DragHandle
                :label="s.name"
                :disabled="sortLocked"
                disabled-hint="清除狀態篩選與搜尋後才能調整順序"
                @move="nudgeService(s, $event)"
              />
            </td>
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
    <div class="space-y-1 text-xs text-gray-500">
      <p v-if="sortLocked" class="text-amber-700">正在篩選狀態或搜尋，暫時無法調整順序</p>
      <p v-else>拖曳左側把手可調整前台顯示順序（僅限同一分類內），放開後立即儲存</p>
      <p>下架的療程前台不會顯示，已經預約的不受影響</p>
    </div>

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
            <th class="w-12"><span class="sr-only">排序</span></th>
            <th>名稱</th>
            <th class="w-20 text-right">療程數</th>
            <th class="w-20 text-right"></th>
          </tr>
        </thead>
        <tbody ref="categoryBody">
          <tr v-for="(c, i) in categories" :key="c.id" data-sortable :data-id="c.id">
            <td class="!px-2"><DragHandle :label="c.name" @move="nudgeCategory(i, $event)" /></td>
            <td><input v-model="c.name" class="admin-input" aria-label="分類名稱" /></td>
            <td class="text-right tabular-nums text-gray-500">{{ c.service_count }}</td>
            <td class="text-right">
              <button type="button" class="admin-link" :disabled="!c.name?.trim()" @click="saveCategory(c)">
                儲存
              </button>
            </td>
          </tr>
        </tbody>
        <!-- 新增列固定在最下面，不參與拖曳 -->
        <tbody>
          <tr>
            <td></td>
            <td>
              <input
                v-model="newCategory.name"
                class="admin-input"
                placeholder="輸入新分類名稱"
                aria-label="新分類名稱"
                @keydown.enter.prevent="newCategory.name.trim() && saveCategory(newCategory)"
              />
            </td>
            <td></td>
            <td class="text-right">
              <button
                type="button"
                class="admin-link"
                :disabled="!newCategory.name.trim()"
                @click="saveCategory(newCategory)"
              >
                新增
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="admin-hint mt-3">拖曳左側把手調整分類順序，放開後立即儲存，前台會依此順序顯示；新分類會排在最後</p>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useServicesStore } from '@/stores/services'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminModal from '@/components/admin/AdminModal.vue'
import DragHandle from '@/components/admin/DragHandle.vue'
import { useSortable, moveItem } from '@/composables/useSortable'

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

// 依分類順序、療程順序排列，跟後端回傳的順序一致
const sortServices = () => {
  const categoryIndex = new Map(categories.value.map((c, i) => [c.id, i]))
  services.value = [...services.value].sort(
    (a, b) =>
      (categoryIndex.get(a.category_id) ?? 0) - (categoryIndex.get(b.category_id) ?? 0) ||
      a.sort_order - b.sort_order ||
      a.id - b.id
  )
}

// 鍵盤移動後畫面會重新排列，把焦點放回同一列的把手
const focusHandle = (id: number) =>
  nextTick(() => document.querySelector<HTMLElement>(`[data-id="${id}"] [data-drag-handle]`)?.focus())

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
        description: s.description || ''
      }
    : { name: '', categoryId: categories.value[0]?.id, price: 1000, duration: 60, description: '' }
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

// ---- 療程排序：只能在同一分類內移動；篩選狀態或搜尋時看不到完整清單，先鎖住
const serviceBody = ref<HTMLElement | null>(null)
const sortLocked = computed(() => !!activeFilter.value || !!keyword.value)

const reorderServices = async (from: number, to: number) => {
  const list = moveItem(filtered.value, from, to)
  const moved = list[to]
  const ids = list.filter((s) => s.category_id === moved.category_id).map((s) => s.id)
  // 先更新畫面再存檔，失敗就重新載入還原
  ids.forEach((id, i) => {
    const s = services.value.find((x) => x.id === id)
    if (s) s.sort_order = i + 1
  })
  sortServices()
  try {
    await apiClient.put('/admin/services/order', { ids })
    toast.success('排序已更新', { timeout: 1500 })
    refreshStorefront()
  } catch (error: any) {
    toast.error(error?.message || '排序儲存失敗，已還原')
    await load()
  }
}

useSortable(serviceBody, {
  onMove: reorderServices,
  canDrop: (dragged, related) => dragged.dataset.category === related.dataset.category,
  disabled: sortLocked
})

const nudgeService = async (s: any, delta: number) => {
  const from = filtered.value.indexOf(s)
  const to = from + delta
  if (filtered.value[to]?.category_id !== s.category_id) return
  await reorderServices(from, to)
  focusHandle(s.id)
}

// ---- 分類
const categoryModal = ref(false)
const categoryBody = ref<HTMLElement | null>(null)
const newCategory = ref({ id: null, name: '' })

const reorderCategories = async (from: number, to: number) => {
  categories.value = moveItem(categories.value, from, to)
  sortServices()
  try {
    await apiClient.put('/admin/categories/order', { ids: categories.value.map((c) => c.id) })
    toast.success('排序已更新', { timeout: 1500 })
    servicesStore.fetchCategories().catch(() => {})
    refreshStorefront()
  } catch (error: any) {
    toast.error(error?.message || '排序儲存失敗，已還原')
    await load()
  }
}

useSortable(categoryBody, { onMove: reorderCategories })

const nudgeCategory = async (index: number, delta: number) => {
  const to = index + delta
  if (to < 0 || to >= categories.value.length) return
  const id = categories.value[index].id
  await reorderCategories(index, to)
  focusHandle(id)
}

const saveCategory = async (c: any) => {
  try {
    const body = { name: c.name, description: c.description }
    if (c.id) await apiClient.put(`/admin/categories/${c.id}`, body)
    else await apiClient.post('/admin/categories', body)
    toast.success('分類已儲存')
    newCategory.value = { id: null, name: '' }
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
