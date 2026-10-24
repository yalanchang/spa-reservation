<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-8 text-center">
      <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">COUPONS</p>
      <h1 class="mt-2 text-3xl font-bold text-cocoa">領券中心</h1>
      <p class="mt-2 text-gray-500">領取後在預約最後一步選擇使用</p>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <select
        v-model="filter"
        class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-cocoa focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
        aria-label="篩選"
      >
        <option value="">全部優惠券</option>
        <option value="eligible">我可以領的</option>
        <option v-for="(label, value) in AUDIENCE_OPTIONS" :key="value" :value="value">{{ label }}</option>
      </select>
      <span class="text-sm text-gray-500">共 {{ visible.length }} 張</span>
      <div class="ml-auto flex items-center gap-4">
        <router-link
          v-if="authStore.isLoggedIn"
          :to="{ path: '/profile', query: { tab: 'coupons' } }"
          class="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          我的優惠券
        </router-link>
        <button
          v-if="authStore.isLoggedIn"
          type="button"
          class="btn-cute !px-5 !py-2 text-sm disabled:pointer-events-none disabled:opacity-50"
          :disabled="!claimableCount || claimingAll"
          @click="claimAll"
        >
          <LoadingSpinner v-if="claimingAll" size="sm" />
          <template v-else>{{ claimableCount ? `一鍵全領（${claimableCount}）` : '已全部領取' }}</template>
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-16"><LoadingSpinner /></div>
    <p v-else-if="!visible.length" class="card-cute p-10 text-center text-gray-500">目前沒有符合的優惠券</p>

    <ul v-else class="space-y-4">
      <li v-for="c in visible" :key="c.id">
        <CouponTicket :coupon="c" :muted="c.claimed || !!c.problem" :note="c.claimed ? null : c.problem">
          <span
            v-if="c.claimed"
            class="whitespace-nowrap rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
            >已領取</span
          >
          <router-link
            v-else-if="!authStore.isLoggedIn"
            :to="{ path: '/login', query: { redirect: '/coupons' } }"
            class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
          >
            登入領取
          </router-link>
          <router-link
            v-else-if="c.need_birthday"
            :to="{ path: '/profile', query: { tab: 'basic' } }"
            class="whitespace-nowrap rounded-full border-2 border-primary-200 px-4 py-1.5 text-sm font-semibold text-primary-600"
          >
            填寫生日
          </router-link>
          <span
            v-else-if="c.problem"
            class="whitespace-nowrap rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500"
          >
            {{ c.button || '暫不可領' }}
          </span>
          <button
            v-else
            type="button"
            class="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition active:scale-95 disabled:pointer-events-none"
            :disabled="claimingId === c.id"
            @click="claim(c)"
          >
            <LoadingSpinner v-if="claimingId === c.id" size="sm" />
            <template v-else>領取</template>
          </button>
        </CouponTicket>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import CouponTicket from '@/components/common/CouponTicket.vue'

const AUDIENCE_OPTIONS: Record<string, string> = {
  all: '全體會員',
  new: '新會員首次預約',
  birthday: '生日當月壽星',
  silver: '銀卡以上會員',
  gold: '金卡會員'
}

const toast = useToast()
const authStore = useAuthStore()
const coupons = ref<any[]>([])
const loading = ref(true)
const claimingId = ref<number | null>(null)
const filter = ref('')

// 排序：可以領的 → 暫時不能領的 → 已經領過的
const rank = (c: any) => (c.claimed ? 2 : c.problem ? 1 : 0)

const visible = computed(() => {
  let list = coupons.value
  if (filter.value === 'eligible') list = list.filter((c) => !c.problem && !c.claimed)
  else if (filter.value) list = list.filter((c) => c.audience === filter.value)
  return [...list].sort((a, b) => rank(a) - rank(b))
})

const claimingAll = ref(false)
const claimableCount = computed(() => coupons.value.filter((c) => !c.claimed && !c.problem).length)

const claimAll = async () => {
  claimingAll.value = true
  try {
    const res = (await apiClient.post('/coupons/claim-all')) as any
    toast.success(res.message)
    await load()
  } catch (error: any) {
    toast.warning(error?.message || '領取失敗')
  } finally {
    claimingAll.value = false
  }
}

const load = async () => {
  try {
    const res = (await apiClient.get('/coupons/center')) as any
    coupons.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '優惠券載入失敗')
  } finally {
    loading.value = false
  }
}

const claim = async (c: any) => {
  claimingId.value = c.id
  try {
    const res = (await apiClient.post(`/coupons/${c.id}/claim`)) as any
    c.claimed = true
    toast.success(res.message)
  } catch (error: any) {
    toast.warning(error?.message || '領取失敗')
  } finally {
    claimingId.value = null
  }
}

onMounted(load)
</script>
