<template>
  <div v-if="loading" class="py-12"><LoadingSpinner /></div>

  <div v-else-if="summary" class="space-y-6">
    <!-- 會員等級 -->
    <div class="rounded-2xl bg-primary-50 p-5">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-lg font-bold text-primary-600">{{ summary.tier }}</p>
        <p class="text-sm text-gray-500">入會日期 {{ summary.memberSince?.replace(/-/g, '/') }}</p>
      </div>
      <template v-if="summary.nextTier">
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div class="h-full rounded-full bg-primary-500 transition-all duration-700" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="mt-2 text-sm text-gray-500">
          再消費 NT$ {{ summary.nextTier.remaining.toLocaleString() }} 即可升級為{{ summary.nextTier.name }}
        </p>
      </template>
      <p v-else class="mt-2 text-sm text-gray-500">你已是最高等級會員，感謝一直以來的支持</p>
    </div>

    <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div v-for="item in stats" :key="item.label" class="rounded-2xl border border-primary-100 p-4">
        <dt class="text-xs text-gray-500">{{ item.label }}</dt>
        <dd class="mt-1 truncate text-xl font-bold text-cocoa">{{ item.value }}</dd>
      </div>
    </dl>

    <div>
      <h3 class="mb-3 font-bold text-cocoa">下一筆預約</h3>
      <router-link
        v-if="summary.nextAppointment"
        to="/appointments"
        class="flex items-center justify-between gap-4 rounded-2xl border border-primary-100 p-4 transition hover:border-primary-300 hover:shadow-sm"
      >
        <div>
          <p class="font-semibold text-cocoa">{{ summary.nextAppointment.service_name }}</p>
          <p class="text-sm text-gray-500">
            {{ summary.nextAppointment.appointment_date.replace(/-/g, '/') }} {{ summary.nextAppointment.start_time }}，美容師 {{ summary.nextAppointment.staff_name }}
          </p>
        </div>
        <span class="text-sm text-primary-600">查看</span>
      </router-link>
      <div v-else class="rounded-2xl border border-dashed border-primary-200 p-6 text-center text-sm text-gray-500">
        目前沒有預約
        <router-link to="/booking" class="ml-1 font-medium text-primary-600 hover:underline">立即預約</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const summary = ref<any>(null)
const loading = ref(true)

const stats = computed(() => [
  { label: '到店次數', value: `${summary.value.visits} 次` },
  { label: '累積消費', value: `NT$ ${summary.value.spent.toLocaleString()}` },
  { label: '寫過的心得', value: `${summary.value.reviewCount} 則` },
  { label: '最常做的療程', value: summary.value.favoriteService?.name || '—' }
])

// 目前等級到下一級的進度
const progress = computed(() => {
  const s = summary.value
  if (!s?.nextTier) return 100
  return Math.min(100, Math.round(((s.spent - s.currentTierMin) / (s.nextTier.min - s.currentTierMin)) * 100))
})

onMounted(async () => {
  try {
    const res = await apiClient.get('/auth/profile/summary') as any
    summary.value = res.data
  } finally {
    loading.value = false
  }
})
</script>
