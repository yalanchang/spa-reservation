<template>
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-8">
      <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">FAVORITES</p>
      <h1 class="mt-2 text-3xl font-bold text-cocoa">我的收藏</h1>
    </div>

    <div v-if="loading" class="py-12">
      <LoadingSpinner />
    </div>

    <div v-else-if="!favoriteServices.length">
      <div class="card-cute mx-auto max-w-md p-10 text-center">
        <HeartIcon class="mx-auto h-12 w-12 text-primary-200" />
        <p class="mt-4 font-semibold text-cocoa">還沒有收藏任何療程</p>
        <router-link to="/services" class="btn-cute mt-6">瀏覽服務項目</router-link>
      </div>
      <section v-if="recommended.length" class="mt-14">
        <h2 class="mb-5 text-xl font-bold text-cocoa">你可能會喜歡</h2>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ServiceCard v-for="service in recommended" :key="service.id" :service="service" layout="classic" />
        </div>
      </section>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-3 border-b border-primary-100 pb-4">
        <template v-if="managing">
          <label class="flex cursor-pointer items-center gap-2 text-sm text-cocoa">
            <input type="checkbox" class="h-4 w-4 accent-primary-600" :checked="allSelected" @change="toggleAll" />
            全選
          </label>
          <span class="text-sm text-gray-500">已選 {{ selected.length }} 項</span>
          <button
            type="button"
            class="rounded-full bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
            :disabled="!selected.length"
            @click="removeSelected"
          >
            移除已選
          </button>
          <button type="button" class="text-sm text-gray-500 hover:text-cocoa" @click="stopManaging">完成</button>
        </template>
        <template v-else>
          <p class="text-sm text-gray-500">共 {{ visibleServices.length }} 項</p>
          <button type="button" class="text-sm font-medium text-primary-600 hover:underline" @click="managing = true">
            管理
          </button>
        </template>

        <select
          v-model="activeCategory"
          class="ml-auto rounded-full border border-primary-100 bg-white px-4 py-2 text-sm text-cocoa focus:outline-none focus:ring-2 focus:ring-primary-100"
          aria-label="分類"
        >
          <option v-for="tab in categoryTabs" :key="tab.id ?? 'all'" :value="tab.id">
            {{ tab.name }}（{{ tab.count }}）
          </option>
        </select>
        <select
          v-model="sort"
          class="rounded-full border border-primary-100 bg-white px-4 py-2 text-sm text-cocoa focus:outline-none focus:ring-2 focus:ring-primary-100"
          aria-label="排序"
        >
          <option value="recent">最近收藏</option>
          <option value="price-asc">價格 低→高</option>
          <option value="price-desc">價格 高→低</option>
          <option value="rating">評分 高→低</option>
        </select>
      </div>

      <TransitionGroup tag="ul" name="fav" class="relative space-y-3">
        <li
          v-for="service in visibleServices"
          :key="service.id"
          class="card-cute flex items-center gap-4 p-3 sm:p-4"
          :class="{ 'ring-2 ring-primary-300': managing && selected.includes(service.id) }"
        >
          <input
            v-if="managing"
            type="checkbox"
            class="h-5 w-5 shrink-0 accent-primary-600"
            :checked="selected.includes(service.id)"
            :aria-label="`選取${service.name}`"
            @change="toggleSelect(service.id)"
          />

          <router-link :to="`/services/${service.id}`" class="shrink-0">
            <img
              :src="serviceImage(service)"
              :alt="service.name"
              class="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-36"
            />
          </router-link>

          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-primary-500">{{ service.category_name }}</p>
            <router-link
              :to="`/services/${service.id}`"
              class="mt-0.5 block truncate font-bold text-cocoa hover:text-primary-600"
            >
              {{ service.name }}
            </router-link>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span class="flex items-center gap-1"><ClockIcon class="h-4 w-4" />{{ service.duration }} 分鐘</span>
              <span v-if="service.review_count" class="flex items-center gap-1">
                <StarIcon class="h-4 w-4 text-amber-400" />
                <span class="font-semibold text-cocoa">{{ service.average_rating }}</span
                >（{{ service.review_count }}）
              </span>
            </div>
            <p class="mt-2 text-lg font-bold text-primary-600 sm:hidden">
              NT$ {{ Number(service.price).toLocaleString() }}
            </p>
          </div>

          <div class="hidden shrink-0 flex-col items-end gap-2 sm:flex">
            <p class="text-xl font-bold text-primary-600">
              <span class="text-sm font-medium">NT$</span> {{ Number(service.price).toLocaleString() }}
            </p>
            <div v-if="!managing" class="flex items-center gap-3">
              <button type="button" class="text-sm text-gray-400 hover:text-cocoa" @click="removeOne(service)">
                移除
              </button>
              <router-link
                :to="`/booking?serviceId=${service.id}`"
                class="rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition active:scale-95"
              >
                預約
              </router-link>
            </div>
          </div>

          <!-- 手機版操作 -->
          <div v-if="!managing" class="flex shrink-0 flex-col items-end gap-2 sm:hidden">
            <router-link
              :to="`/booking?serviceId=${service.id}`"
              class="rounded-full bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white"
              >預約</router-link
            >
            <button type="button" class="text-xs text-gray-400" @click="removeOne(service)">移除</button>
          </div>
        </li>
      </TransitionGroup>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { HeartIcon, ClockIcon } from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'
import { useServicesStore } from '@/stores/services'
import { useFavorites } from '@/composables/useFavorites'
import { serviceImage } from '@/utils/serviceImage'
import ServiceCard from '@/components/common/ServiceCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UndoToast from '@/components/common/UndoToast.vue'

const servicesStore = useServicesStore()
const toast = useToast()
const { favorites, removeFavorites, setFavorites } = useFavorites()
const loading = ref(false)

const activeCategory = ref<number | undefined>(undefined)
const sort = ref('recent')
const managing = ref(false)
const selected = ref<number[]>([])

// 依收藏的先後；已下架的服務不顯示
const favoriteServices = computed(() =>
  favorites.value
    .map((id) => servicesStore.services.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s)
)

const categoryTabs = computed(() => {
  const tabs: { id: number | undefined; name: string; count: number }[] = [
    { id: undefined, name: '全部', count: favoriteServices.value.length }
  ]
  for (const s of favoriteServices.value) {
    const tab = tabs.find((t) => t.id === s.category_id)
    if (tab) tab.count++
    else tabs.push({ id: s.category_id, name: s.category_name || '其他', count: 1 })
  }
  return tabs
})

const visibleServices = computed(() => {
  const list = favoriteServices.value.filter((s) => !activeCategory.value || s.category_id === activeCategory.value)
  if (sort.value === 'recent') return [...list].reverse()
  if (sort.value === 'price-asc') return [...list].sort((a, b) => Number(a.price) - Number(b.price))
  if (sort.value === 'price-desc') return [...list].sort((a, b) => Number(b.price) - Number(a.price))
  return [...list].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
})

// 沒有收藏時推薦評價最高的 3 個
const recommended = computed(() =>
  [...servicesStore.services]
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0) || (b.review_count || 0) - (a.review_count || 0))
    .slice(0, 3)
)

// ---- 移除（可復原）
const undoToast = (message: string, previous: number[]) => {
  toast.info(
    {
      component: UndoToast,
      props: {
        message,
        onUndo: () => {
          setFavorites(previous)
          toast.success('已復原')
        }
      }
    },
    { timeout: 5000, closeOnClick: false }
  )
}

const removeOne = (service: any) => {
  const previous = removeFavorites([service.id])
  undoToast(`已移除「${service.name}」`, previous)
  fixCategory()
}

const removeSelected = () => {
  const count = selected.value.length
  const previous = removeFavorites(selected.value)
  undoToast(`已移除 ${count} 項`, previous)
  stopManaging()
  fixCategory()
}

// 目前分類被移光了就回到「全部」
const fixCategory = () => {
  if (activeCategory.value && !favoriteServices.value.some((s) => s.category_id === activeCategory.value)) {
    activeCategory.value = undefined
  }
}

// ---- 管理模式
const allSelected = computed(
  () => visibleServices.value.length > 0 && visibleServices.value.every((s) => selected.value.includes(s.id))
)

const toggleSelect = (id: number) => {
  selected.value = selected.value.includes(id) ? selected.value.filter((s) => s !== id) : [...selected.value, id]
}

const toggleAll = () => {
  selected.value = allSelected.value ? [] : visibleServices.value.map((s) => s.id)
}

const stopManaging = () => {
  managing.value = false
  selected.value = []
}

onMounted(async () => {
  const tasks: Promise<unknown>[] = []
  if (!servicesStore.services.length) tasks.push(servicesStore.fetchServices())
  if (!servicesStore.categories.length) tasks.push(servicesStore.fetchCategories())
  if (!tasks.length) return
  loading.value = true
  await Promise.all(tasks)
  loading.value = false
})
</script>

<style scoped>
.fav-enter-active,
.fav-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fav-enter-from,
.fav-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.fav-leave-active {
  position: absolute;
  width: 100%;
}
.fav-move {
  transition: transform 0.35s ease;
}
</style>
