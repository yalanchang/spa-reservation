<template>
  <!-- 服務項目頁：直式緊湊卡片，重點用條列 -->
  <article
    v-if="layout === 'detailed'"
    class="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-primary-100 bg-white transition-colors duration-300 hover:border-primary-300"
    @click="goToDetail"
  >
    <div class="relative">
      <img :src="serviceImage(service)" :alt="service.name" class="aspect-[16/10] w-full object-cover" />
      <span v-if="badge" class="absolute left-3 top-3 rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-semibold text-white">{{ badge }}</span>
      <button
        class="absolute right-3 top-3 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center group/heart"
        :class="{ 'animate-pop': popping }"
        :aria-label="liked ? '取消收藏' : '加入收藏'"
        @click.stop="onToggleFavorite"
        @animationend="popping = false"
      >
        <HeartSolid v-if="liked" class="w-[18px] h-[18px] text-primary-500 transition-colors group-hover/heart:text-primary-700" />
        <HeartOutline v-else class="w-[18px] h-[18px] text-primary-400 transition-colors group-hover/heart:text-primary-700" />
      </button>
    </div>

    <div class="flex flex-1 flex-col px-4 pb-4 pt-3">
      <div class="flex items-center justify-between gap-2 text-xs">
        <span class="font-semibold text-primary-500">{{ service.category_name }}</span>
        <span v-if="service.review_count" class="flex items-center gap-0.5 text-gray-500">
          <StarIcon class="h-3.5 w-3.5 text-amber-400" />
          <span class="font-bold text-cocoa">{{ service.average_rating }}</span>（{{ service.review_count }}）
        </span>
        <span v-else class="text-gray-400">尚無評價</span>
      </div>
      <h3 class="mt-1 text-lg font-bold text-cocoa transition-colors group-hover:text-primary-600">{{ service.name }}</h3>

      <!-- 重點條列 -->
      <ul class="mb-4 mt-2 space-y-1">
        <li v-for="point in highlights" :key="point" class="flex items-center gap-1.5 text-sm text-gray-600">
          <CheckCircleIcon class="h-4 w-4 shrink-0 text-primary-400" />
          <span class="truncate">{{ point }}</span>
        </li>
      </ul>

      <div class="mt-auto flex items-center justify-between gap-2 border-t border-primary-50 pt-3">
        <div class="leading-tight">
          <p class="text-xl font-extrabold text-primary-600"><span class="text-xs font-semibold">NT$</span> {{ Number(service.price).toLocaleString() }}</p>
          <p class="flex items-center gap-1 text-xs text-gray-500"><ClockIcon class="h-3.5 w-3.5" />{{ service.duration }} 分鐘</p>
        </div>
        <button
          type="button"
          class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
          @click.stop="goToBooking"
        >
          預約
        </button>
      </div>
    </div>
  </article>

  <!-- 首頁人氣療程用的樣式 -->
  <div
    v-else
    class="group card-cute cursor-pointer overflow-hidden"
    @click="goToDetail"
  >
    <div class="relative overflow-hidden">
      <img :src="serviceImage(service)" :alt="service.name" class="h-48 w-full object-cover" />
      <span class="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-cocoa shadow-sm">
        {{ service.duration }} 分鐘
      </span>
      <button
        class="absolute right-3 top-3 w-9 h-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center group/heart"
        :class="{ 'animate-pop': popping }"
        :aria-label="liked ? '取消收藏' : '加入收藏'"
        @click.stop="onToggleFavorite"
        @animationend="popping = false"
      >
        <HeartSolid v-if="liked" class="w-5 h-5 text-primary-500 transition-colors group-hover/heart:text-primary-700" />
        <HeartOutline v-else class="w-5 h-5 text-primary-400 transition-colors group-hover/heart:text-primary-700" />
      </button>
    </div>
    <div class="p-5">
      <h3 class="mb-1 text-lg font-bold text-cocoa transition group-hover:text-primary-600">{{ service.name }}</h3>
      <p class="mb-4 line-clamp-2 text-sm text-gray-500">{{ service.description }}</p>
      <div class="flex items-center justify-between">
        <span class="font-bold text-primary-600">NT$ {{ Number(service.price).toLocaleString() }}</span>
        <span v-if="service.review_count" class="flex items-center gap-1 text-sm text-cocoa">
          <StarIcon class="h-4 w-4 text-amber-400" />
          <span class="font-semibold">{{ service.average_rating }}</span>
          <span class="text-gray-400">（{{ service.review_count }}）</span>
        </span>
        <span v-else class="text-xs text-gray-400">尚無評價</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { HeartIcon as HeartOutline, ClockIcon } from '@heroicons/vue/24/outline'
import { HeartIcon as HeartSolid, StarIcon, CheckCircleIcon } from '@heroicons/vue/24/solid'
import { useToast } from 'vue-toastification'
import { serviceImage } from '@/utils/serviceImage'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const toast = useToast()
const { isFavorite, toggleFavorite } = useFavorites()

const props = withDefaults(defineProps<{
  // detailed：服務項目頁；classic：首頁人氣療程
  layout?: 'detailed' | 'classic'
  service: {
    id: number
    name: string
    description: string
    price: number
    duration: number
    image_url?: string
    category_name?: string
    average_rating?: number | null
    review_count?: number
  }
}>(), { layout: 'detailed' })

const liked = computed(() => isFavorite(props.service.id))

// 介紹用頓號、逗號分開就變成條列重點
const highlights = computed(() =>
  (props.service.description || '')
    .split(/[、，,；;]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 3)
)

// 評分 4.5 以上且有 3 則以上心得標「好評推薦」
const badge = computed(() =>
  (props.service.review_count || 0) >= 3 && (props.service.average_rating || 0) >= 4.5 ? '好評推薦' : ''
)
const popping = ref(false)

const onToggleFavorite = () => {
  popping.value = true
  const added = toggleFavorite(props.service.id)
  toast.success(added ? `已收藏「${props.service.name}」` : '已取消收藏')
}

const goToDetail = () => {
  router.push(`/services/${props.service.id}`)
}

// 直接帶著這個療程去預約
const goToBooking = () => {
  router.push(`/booking?serviceId=${props.service.id}`)
}
</script>
