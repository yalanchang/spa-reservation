<template>
    <div class="max-w-4xl mx-auto">
      <button
        class="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-cocoa shadow-sm mb-6 transition hover:text-primary-600 hover:font-bold"
        @click="router.back()"
      >
        返回服務列表
      </button>
  
      <div v-if="loading" class="text-center py-20">
        <LoadingSpinner />
      </div>
  
      <div v-else-if="!service" class="text-center py-20 text-gray-500">
        服務不存在
      </div>
  
      <div v-else class="card-cute overflow-hidden">
        <div class="relative">
          <img
            :src="serviceImage(service)"
            :alt="service.name"
            class="w-full h-64 sm:h-80 object-cover"
          />
          <button
            class="absolute right-4 top-4 w-11 h-11 rounded-full bg-white/90 shadow flex items-center justify-center group/heart"
            :class="{ 'animate-pop': popping }"
            :aria-label="isFavorite(service.id) ? '取消收藏' : '加入收藏'"
            @click="onToggleFavorite"
            @animationend="popping = false"
          >
            <HeartSolid v-if="isFavorite(service.id)" class="w-6 h-6 text-primary-500 transition-colors group-hover/heart:text-primary-700" />
            <HeartOutline v-else class="w-6 h-6 text-primary-400 transition-colors group-hover/heart:text-primary-700" />
          </button>
        </div>
  
        <div class="p-6 sm:p-8">
          <!-- 標題 -->
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <span class="inline-block px-3 py-1 bg-primary-100 text-primary-600 text-sm rounded-full mb-3">
                {{ service.category_name }}
              </span>
              <h1 class="text-3xl font-bold text-cocoa">{{ service.name }}</h1>
            </div>
            <div class="sm:text-right">
              <div class="text-3xl font-bold text-primary-600">NT$ {{ Number(service.price).toLocaleString() }}</div>
              <div class="text-gray-500 mt-1">{{ service.duration }} 分鐘</div>
            </div>
          </div>
  
          <!-- 描述 -->
          <div class="border-t pt-6 mb-6">
            <h2 class="text-lg font-semibold mb-3">服務介紹</h2>
            <p class="text-gray-600 leading-relaxed">{{ service.description }}</p>
          </div>
  
          <!-- 注意事項 -->
          <div v-if="service.notes" class="border-t pt-6 mb-6">
            <h2 class="text-lg font-semibold mb-3">注意事項</h2>
            <p class="text-gray-600 leading-relaxed">{{ service.notes }}</p>
          </div>
  
          <div class="border-t pt-6">
            <button class="btn-cute w-full py-4 text-lg" @click="goToBooking">預約這個療程</button>
          </div>
        </div>
      </div>

      <!-- 顧客心得 -->
      <section v-if="service" class="mt-10">
        <div class="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">REVIEWS</p>
            <h2 class="mt-1 text-2xl font-bold text-cocoa">顧客心得</h2>
          </div>
          <div v-if="reviewSummary.count" class="flex items-center gap-2">
            <span class="text-3xl font-extrabold text-cocoa">{{ reviewSummary.average }}</span>
            <div>
              <StarRating :model-value="reviewSummary.average || 0" readonly size="sm" />
              <p class="text-xs text-gray-400">{{ reviewSummary.count }} 則心得</p>
            </div>
          </div>
        </div>

        <div v-if="reviewsLoading" class="py-8"><LoadingSpinner /></div>
        <div v-else-if="!reviews.length" class="card-cute p-8 text-center text-gray-500">
          還沒有人分享心得，體驗後歡迎在「我的預約」留下你的感想
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="(review, i) in reviews"
            :key="review.id"
            v-reveal="Math.min(i, 5) * 80"
          >
            <div class="card-cute p-5 transition hover:font-bold">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-600">
                    {{ review.user_name.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-semibold text-cocoa">{{ review.user_name }}</p>
                    <p class="text-xs text-gray-400">美容師 {{ review.staff_name }}，{{ formatReviewDate(review.created_at) }}</p>
                  </div>
                </div>
                <StarRating :model-value="review.rating" readonly size="sm" />
              </div>
              <p class="mt-3 leading-relaxed text-gray-600 whitespace-pre-line">{{ review.comment }}</p>
              <div v-if="review.staff_reply" class="mt-3 rounded-2xl bg-primary-50 px-4 py-3 text-sm text-cocoa">
                <span class="font-semibold text-primary-600">店家回覆：</span>{{ review.staff_reply }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import apiClient from '@/api/client'
  import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
  import { HeartIcon as HeartOutline } from '@heroicons/vue/24/outline'
  import { HeartIcon as HeartSolid } from '@heroicons/vue/24/solid'
  import { useToast } from 'vue-toastification'
  import { serviceImage } from '@/utils/serviceImage'
  import { useFavorites } from '@/composables/useFavorites'
  import StarRating from '@/components/common/StarRating.vue'
  
  const route = useRoute()
  const router = useRouter()
  const service = ref<any>(null)
  const loading = ref(true)
  const popping = ref(false)
  const reviews = ref<any[]>([])
  const reviewSummary = ref<{ count: number; average: number | null }>({ count: 0, average: null })
  const reviewsLoading = ref(true)

  const formatReviewDate = (value: string) => {
    const d = new Date(value)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const fetchReviews = async () => {
    try {
      const res = await apiClient.get(`/reviews/service/${route.params.id}`) as any
      reviews.value = res.data?.reviews || []
      reviewSummary.value = { count: res.data?.count || 0, average: res.data?.average ?? null }
    } catch (e) {
      console.error(e)
    } finally {
      reviewsLoading.value = false
    }
  }
  const toast = useToast()
  const { isFavorite, toggleFavorite } = useFavorites()

  const onToggleFavorite = () => {
    popping.value = true
    const added = toggleFavorite(service.value.id)
    toast.success(added ? `已收藏「${service.value.name}」` : '已取消收藏')
  }
  
  onMounted(async () => {
    fetchReviews()
    try {
      const res = await apiClient.get(`/services/${route.params.id}`)
      service.value = res.data
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  })
  
  const goToBooking = () => {
    router.push(`/booking?serviceId=${service.value.id}`)
  }
  </script>