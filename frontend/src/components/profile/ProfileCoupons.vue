<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="status" class="profile-input !w-auto" aria-label="狀態">
        <option value="available">可使用（{{ count('available') }}）</option>
        <option value="used">已使用（{{ count('used') }}）</option>
        <option value="unavailable">無法使用（{{ count('unavailable') }}）</option>
      </select>
      <router-link to="/coupons" class="ml-auto text-sm font-medium text-primary-600 hover:text-primary-700"
        >去領券中心</router-link
      >
    </div>

    <div v-if="loading" class="py-10"><LoadingSpinner /></div>
    <div v-else-if="!visible.length" class="rounded-2xl bg-primary-50/60 px-5 py-8 text-center text-sm text-gray-500">
      {{ status === 'available' ? '還沒有可以使用的優惠券' : '沒有優惠券' }}
    </div>
    <ul v-else class="space-y-3">
      <li v-for="c in visible" :key="c.id">
        <CouponTicket :coupon="c" :muted="c.status !== 'available'" :note="noteOf(c)">
          <router-link
            v-if="c.status === 'available'"
            to="/booking"
            class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
          >
            去預約
          </router-link>
        </CouponTicket>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import CouponTicket from '@/components/common/CouponTicket.vue'

const toast = useToast()
const coupons = ref<any[]>([])
const loading = ref(true)
const status = ref('available')

const count = (s: string) => coupons.value.filter((c) => c.status === s).length
const visible = computed(() => coupons.value.filter((c) => c.status === status.value))

const noteOf = (c: any) => {
  if (c.status === 'used') return `已使用 ${c.used_count} 次`
  if (c.status === 'unavailable') return c.problem
  return c.per_user_limit > 1 ? `剩餘 ${c.per_user_limit - c.used_count} 次` : null
}

onMounted(async () => {
  try {
    const res = (await apiClient.get('/coupons/mine')) as any
    coupons.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '優惠券載入失敗')
  } finally {
    loading.value = false
  }
})
</script>
