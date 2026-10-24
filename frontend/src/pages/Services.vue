<template>
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">OUR MENU</p>
      <h1 class="mt-2 text-3xl font-bold text-cocoa">服務項目</h1>
      <p class="mt-2 text-gray-500">依需求挑選適合你的療程</p>
    </div>

    <div class="lg:grid lg:grid-cols-[16rem_1fr] lg:items-start lg:gap-8">
      <!-- 手機：遮罩 -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-200"
        leave-to-class="opacity-0"
      >
        <div v-if="filtersOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="filtersOpen = false"></div>
      </Transition>

      <!-- 篩選：桌機是左側欄，手機是從下方滑出的面板 -->
      <aside
        class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:shadow-none"
        :class="filtersOpen ? 'block' : 'hidden lg:block'"
        aria-label="篩選條件"
      >
        <div
          class="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-4 lg:static lg:bg-transparent lg:px-0 lg:pt-0"
        >
          <h2 class="text-lg font-bold text-cocoa">篩選</h2>
          <div class="flex items-center gap-3">
            <button
              v-if="hasFilters"
              type="button"
              class="text-sm text-primary-600 hover:font-bold"
              @click="resetFilters"
            >
              清除全部
            </button>
            <button type="button" class="text-gray-400 lg:hidden" aria-label="關閉" @click="filtersOpen = false">
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
        </div>

        <div class="px-5 lg:px-0">
          <!-- 搜尋 -->
          <div class="relative mb-2">
            <MagnifyingGlassIcon
              class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="keyword"
              type="search"
              placeholder="搜尋療程"
              aria-label="搜尋療程"
              class="filter-field w-full !pl-10 !pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              v-if="keyword"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="清除搜尋"
              @click="keyword = ''"
            >
              <XMarkIcon class="h-4 w-4" />
            </button>
          </div>

          <!-- 分類 -->
          <section class="filter-section">
            <button
              type="button"
              class="filter-toggle"
              :aria-expanded="openSections.category"
              @click="toggleSection('category')"
            >
              分類
              <ChevronDownIcon
                class="h-5 w-5 text-gray-400 transition"
                :class="{ 'rotate-180': openSections.category }"
              />
            </button>
            <div v-show="openSections.category" class="mt-3 space-y-1">
              <label
                v-for="category in categoryOptions"
                :key="category.id ?? 'all'"
                class="filter-option"
                :class="{ 'filter-option-disabled': !category.count && selectedCategory !== category.id }"
              >
                <input
                  type="radio"
                  name="category"
                  class="filter-check rounded-full"
                  :checked="selectedCategory === category.id"
                  :disabled="!category.count && selectedCategory !== category.id"
                  @change="selectedCategory = category.id"
                />
                <span class="flex-1" :class="{ 'font-bold text-primary-600': selectedCategory === category.id }">{{
                  category.name
                }}</span>
                <span class="text-xs text-gray-400">{{ category.count }}</span>
              </label>
            </div>
          </section>

          <!-- 價格 -->
          <section class="filter-section">
            <button
              type="button"
              class="filter-toggle"
              :aria-expanded="openSections.price"
              @click="toggleSection('price')"
            >
              價格
              <ChevronDownIcon class="h-5 w-5 text-gray-400 transition" :class="{ 'rotate-180': openSections.price }" />
            </button>
            <div v-show="openSections.price" class="mt-3">
              <div class="space-y-1">
                <label v-for="preset in PRICE_PRESETS" :key="preset.label" class="filter-option">
                  <input
                    type="radio"
                    name="price"
                    class="filter-check rounded-full"
                    :checked="isPresetActive(preset)"
                    @change="applyPreset(preset)"
                  />
                  <span class="flex-1" :class="{ 'font-bold text-primary-600': isPresetActive(preset) }">{{
                    preset.label
                  }}</span>
                </label>
              </div>

              <p class="mb-2 mt-4 text-xs text-gray-500">
                自訂範圍：NT$ {{ priceMin.toLocaleString() }} – {{ priceMax.toLocaleString() }}
              </p>
              <div class="price-slider relative h-6 w-full">
                <div class="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary-100"></div>
                <div
                  class="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary-500"
                  :style="{ left: `${percent(priceMin)}%`, right: `${100 - percent(priceMax)}%` }"
                ></div>
                <input
                  type="range"
                  :min="priceBounds.min"
                  :max="priceBounds.max"
                  :step="PRICE_STEP"
                  :value="priceMin"
                  aria-label="最低價格"
                  @input="setMin(Number(($event.target as HTMLInputElement).value))"
                />
                <input
                  type="range"
                  :min="priceBounds.min"
                  :max="priceBounds.max"
                  :step="PRICE_STEP"
                  :value="priceMax"
                  aria-label="最高價格"
                  @input="setMax(Number(($event.target as HTMLInputElement).value))"
                />
              </div>
              <div class="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  class="filter-field w-full min-w-0 px-2 text-center"
                  :min="priceBounds.min"
                  :max="priceBounds.max"
                  :step="PRICE_STEP"
                  :value="priceMin"
                  aria-label="最低價格"
                  @change="setMin(Number(($event.target as HTMLInputElement).value), true)"
                />
                <span class="text-gray-400">–</span>
                <input
                  type="number"
                  class="filter-field w-full min-w-0 px-2 text-center"
                  :min="priceBounds.min"
                  :max="priceBounds.max"
                  :step="PRICE_STEP"
                  :value="priceMax"
                  aria-label="最高價格"
                  @change="setMax(Number(($event.target as HTMLInputElement).value), true)"
                />
              </div>
            </div>
          </section>

          <!-- 時長（可複選） -->
          <section class="filter-section">
            <button
              type="button"
              class="filter-toggle"
              :aria-expanded="openSections.duration"
              @click="toggleSection('duration')"
            >
              時長
              <ChevronDownIcon
                class="h-5 w-5 text-gray-400 transition"
                :class="{ 'rotate-180': openSections.duration }"
              />
            </button>
            <div v-show="openSections.duration" class="mt-3 space-y-1">
              <label
                v-for="d in durationOptions"
                :key="d.value"
                class="filter-option"
                :class="{ 'filter-option-disabled': !d.count && !durations.includes(d.value) }"
              >
                <input
                  type="checkbox"
                  class="filter-check rounded"
                  :checked="durations.includes(d.value)"
                  :disabled="!d.count && !durations.includes(d.value)"
                  @change="toggleDuration(d.value)"
                />
                <span class="flex-1" :class="{ 'font-bold text-primary-600': durations.includes(d.value) }">{{
                  d.label
                }}</span>
                <span class="text-xs text-gray-400">{{ d.count }}</span>
              </label>
            </div>
          </section>
        </div>

        <!-- 手機：看結果 -->
        <div class="sticky bottom-0 border-t border-primary-50 bg-white p-4 lg:hidden">
          <button type="button" class="btn-cute w-full py-3" @click="filtersOpen = false">
            查看 {{ filteredServices.length }} 項療程
          </button>
        </div>
      </aside>

      <!-- 列表 -->
      <div class="min-w-0">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-cocoa shadow-sm lg:hidden"
            @click="filtersOpen = true"
          >
            <AdjustmentsHorizontalIcon class="h-5 w-5" />
            篩選
            <span
              v-if="appliedFilters.length"
              class="rounded-full bg-primary-600 px-1.5 text-xs leading-5 text-white"
              >{{ appliedFilters.length }}</span
            >
          </button>

          <select v-model="sort" class="filter-field ml-auto" aria-label="排序">
            <option v-for="o in SORTS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>

        <div v-if="loading" class="text-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="!filteredServices.length" class="card-cute p-12 text-center text-gray-500">
          沒有符合條件的療程，試試放寬價格或時長
          <button class="btn-cute-outline mt-5 flex mx-auto" @click="resetFilters">清除全部條件</button>
        </div>

        <template v-else>
          <TransitionGroup
            tag="div"
            name="card"
            appear
            class="relative grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            <ServiceCard
              v-for="(service, i) in filteredServices"
              :key="service.id"
              :service="service"
              :style="{ '--i': Math.min(i, 8) }"
            />
          </TransitionGroup>
          <p class="mt-6 text-right text-sm text-gray-500">共 {{ filteredServices.length }} 項療程</p>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { XMarkIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useServicesStore } from '@/stores/services'
import ServiceCard from '@/components/common/ServiceCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
const servicesStore = useServicesStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const filtersOpen = ref(false)

const PRICE_STEP = 100

// 價格快速選擇；null 代表不限
const PRICE_PRESETS = [
  { label: '不限', min: null, max: null },
  { label: '1,000 以下', min: null, max: 1000 },
  { label: '1,000–2,000', min: 1000, max: 2000 },
  { label: '2,000 以上', min: 2000, max: null }
]

const SORTS = [
  { value: '', label: '預設排序' },
  { value: 'price-asc', label: '價格 低→高' },
  { value: 'price-desc', label: '價格 高→低' },
  { value: 'duration-asc', label: '時間 短→長' },
  { value: 'rating-desc', label: '評分 高→低' },
  { value: 'rating-asc', label: '評分 低→高' }
]

// 篩選條件從網址帶入，換頁回來或分享連結都會保留
const query = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : '')
const selectedCategory = ref<number | undefined>(Number(query('category')) || undefined)
const keyword = ref(query('q'))
// 沒設定時用 null 代表不限，滑桿顯示在兩端
const priceMinQuery = ref<number | null>(Number(query('min')) || null)
const priceMaxQuery = ref<number | null>(Number(query('max')) || null)
// 時長可複選，網址用逗號分隔，例如 duration=45,60
const durations = ref<string[]>(query('duration') ? query('duration').split(',').filter(Boolean) : [])

const toggleDuration = (value: string) => {
  durations.value = durations.value.includes(value)
    ? durations.value.filter((d) => d !== value)
    : [...durations.value, value].sort((a, b) => Number(a) - Number(b))
}

// 各區塊可收合，預設全部展開
const openSections = ref({ category: true, price: true, duration: true })
const toggleSection = (key: 'category' | 'price' | 'duration') => {
  openSections.value[key] = !openSections.value[key]
}
const sort = ref(query('sort'))

const categories = computed(() => servicesStore.categories)

// 價格範圍依現有服務決定，取到百位數
const priceBounds = computed(() => {
  const prices = servicesStore.services.map((s) => Number(s.price))
  if (!prices.length) return { min: 0, max: 5000 }
  return {
    min: Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP,
    max: Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP
  }
})
const priceMin = computed(() => Math.max(priceMinQuery.value ?? priceBounds.value.min, priceBounds.value.min))
const priceMax = computed(() => Math.min(priceMaxQuery.value ?? priceBounds.value.max, priceBounds.value.max))

const percent = (value: number) => {
  const { min, max } = priceBounds.value
  return max === min ? 0 : ((value - min) / (max - min)) * 100
}

// 拖到兩端就視為不限；手動輸入時兩個值顛倒會自動交換
const setMin = (value: number, typed = false) => {
  if (Number.isNaN(value)) return
  let v = Math.max(priceBounds.value.min, Math.min(value, priceBounds.value.max))
  if (v > priceMax.value) {
    const oldMax = priceMax.value
    if (typed) priceMaxQuery.value = v >= priceBounds.value.max ? null : v
    v = oldMax
  }
  priceMinQuery.value = v <= priceBounds.value.min ? null : v
}
const setMax = (value: number, typed = false) => {
  if (Number.isNaN(value)) return
  let v = Math.max(priceBounds.value.min, Math.min(value, priceBounds.value.max))
  if (v < priceMin.value) {
    const oldMin = priceMin.value
    if (typed) priceMinQuery.value = v <= priceBounds.value.min ? null : v
    v = oldMin
  }
  priceMaxQuery.value = v >= priceBounds.value.max ? null : v
}

const isPresetActive = (preset: { min: number | null; max: number | null }) =>
  priceMinQuery.value === preset.min && priceMaxQuery.value === preset.max

// 再按一次同一個快速選擇就取消
const applyPreset = (preset: { min: number | null; max: number | null }) => {
  if (isPresetActive(preset)) {
    priceMinQuery.value = null
    priceMaxQuery.value = null
  } else {
    priceMinQuery.value = preset.min
    priceMaxQuery.value = preset.max
  }
}

// 是否符合篩選條件；skip 指定要略過的條件，用來計算各選項的數量
const matches = (s: any, skip: 'category' | 'duration' | null = null) => {
  const q = keyword.value.trim().toLowerCase()
  const p = Number(s.price)
  return (
    (skip === 'category' || !selectedCategory.value || s.category_id === selectedCategory.value) &&
    (!q || `${s.name}${s.description || ''}`.toLowerCase().includes(q)) &&
    p >= priceMin.value &&
    p <= priceMax.value &&
    (skip === 'duration' || !durations.value.length || durations.value.includes(String(Number(s.duration))))
  )
}

// 每個分類、時長在其他條件下還有幾項，0 項的會變灰
const categoryOptions = computed(() => {
  const pool = servicesStore.services.filter((s) => matches(s, 'category'))
  return [
    { id: undefined as number | undefined, name: '全部', count: pool.length },
    ...categories.value.map((c: any) => ({
      id: c.id as number | undefined,
      name: c.name,
      count: pool.filter((s) => s.category_id === c.id).length
    }))
  ]
})

const durationOptions = computed(() => {
  const pool = servicesStore.services.filter((s) => matches(s, 'duration'))
  const values = [...new Set(servicesStore.services.map((s) => Number(s.duration)))].sort((a, b) => a - b)
  return values.map((v) => ({
    value: String(v),
    label: `${v} 分鐘`,
    count: pool.filter((s) => Number(s.duration) === v).length
  }))
})

// 已套用的條件（排序不算），可個別移除
const appliedFilters = computed(() => {
  const list: { key: string; label: string; clear: () => void }[] = []
  const category = categories.value.find((c: any) => c.id === selectedCategory.value)
  if (category) list.push({ key: 'category', label: category.name, clear: () => (selectedCategory.value = undefined) })
  if (keyword.value.trim())
    list.push({ key: 'q', label: `「${keyword.value.trim()}」`, clear: () => (keyword.value = '') })
  if (priceMinQuery.value || priceMaxQuery.value) {
    list.push({
      key: 'price',
      label: `NT$ ${priceMin.value.toLocaleString()}–${priceMax.value.toLocaleString()}`,
      clear: () => {
        priceMinQuery.value = null
        priceMaxQuery.value = null
      }
    })
  }
  for (const d of durations.value) {
    list.push({ key: `duration-${d}`, label: `${d} 分鐘`, clear: () => toggleDuration(d) })
  }
  return list
})

const hasFilters = computed(() => appliedFilters.value.length > 0)

const filteredServices = computed(() => {
  const list = servicesStore.services.filter((s) => matches(s))

  if (sort.value === 'price-asc') list.sort((a, b) => Number(a.price) - Number(b.price))
  if (sort.value === 'price-desc') list.sort((a, b) => Number(b.price) - Number(a.price))
  if (sort.value === 'duration-asc') list.sort((a, b) => Number(a.duration) - Number(b.duration))
  if (sort.value === 'rating-desc' || sort.value === 'rating-asc') {
    const dir = sort.value === 'rating-desc' ? -1 : 1
    // 還沒有評價的視為最低分：高→低排在最後，低→高排在最前；同分時心得多的在前
    const score = (x: any) => (x.average_rating == null ? -1 : Number(x.average_rating))
    list.sort((a, b) => (score(a) - score(b)) * dir || (b.review_count || 0) - (a.review_count || 0) || a.id - b.id)
  }
  return list
})

const resetFilters = () => {
  selectedCategory.value = undefined
  keyword.value = ''
  priceMinQuery.value = null
  priceMaxQuery.value = null
  durations.value = []
}

watch([selectedCategory, keyword, priceMinQuery, priceMaxQuery, durations, sort], () => {
  router.replace({
    query: {
      category: selectedCategory.value ? String(selectedCategory.value) : undefined,
      q: keyword.value.trim() || undefined,
      min: priceMinQuery.value ? String(priceMinQuery.value) : undefined,
      max: priceMaxQuery.value ? String(priceMaxQuery.value) : undefined,
      duration: durations.value.length ? durations.value.join(',') : undefined,
      sort: sort.value || undefined
    }
  })
})

onMounted(async () => {
  loading.value = true
  await Promise.all([servicesStore.fetchServices(), servicesStore.fetchCategories()])
  loading.value = false
})
</script>

<style scoped>
.filter-section {
  @apply border-b border-primary-100 py-4 first-of-type:mt-2;
}
.filter-toggle {
  @apply flex w-full items-center justify-between text-sm font-bold text-cocoa;
}
.filter-option {
  /* 滑過只變色，不加粗，數字才不會看起來變大 */
  @apply flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 text-sm text-cocoa transition-colors hover:text-primary-600;
}
.filter-option-disabled {
  @apply cursor-not-allowed opacity-40 hover:text-cocoa;
}
.filter-check {
  @apply h-4 w-4 shrink-0 cursor-pointer border-gray-300 accent-primary-600 disabled:cursor-not-allowed;
}
.filter-title {
  @apply mb-2 text-sm font-bold text-cocoa;
}
/* 兩個 range 疊在一起做雙滑桿：軌道不吃滑鼠，只有圓點可以拖 */
.price-slider input[type='range'] {
  @apply pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent;
}
.price-slider input[type='range']::-webkit-slider-thumb {
  @apply pointer-events-auto h-5 w-5 cursor-grab appearance-none rounded-full border-2 border-primary-500 bg-white shadow transition active:scale-110 active:cursor-grabbing;
}
.price-slider input[type='range']::-moz-range-thumb {
  @apply pointer-events-auto h-5 w-5 cursor-grab rounded-full border-2 border-primary-500 bg-white shadow;
}
.price-slider input[type='range']:focus-visible::-webkit-slider-thumb {
  @apply ring-4 ring-primary-100;
}
.filter-field {
  @apply rounded-full border border-primary-100 bg-white px-4 py-2 text-sm text-cocoa focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100;
}
.card-enter-active {
  /* 一張接一張由下往上淡入 */
  transition:
    opacity 0.45s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * 60ms);
}
.card-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
.card-leave-active {
  /* 篩掉的卡片快速淡出，不佔位置，其他卡片才能馬上補位 */
  position: absolute;
  transition: opacity 0.2s ease;
}
.card-leave-to {
  opacity: 0;
}
.card-move {
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .card-enter-active,
  .card-leave-active,
  .card-move {
    transition: none;
  }
}
</style>
