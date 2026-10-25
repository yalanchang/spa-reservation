<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-8 text-center">
      <p class="text-sm font-semibold tracking-[0.2em] text-primary-500">BOOKING</p>
      <h1 class="mt-2 text-3xl font-bold text-cocoa">預約服務</h1>
    </div>

    <!-- 步驟指示器 -->
    <ol class="mb-10 flex items-start justify-center">
      <template v-for="(step, index) in steps" :key="step">
        <li class="flex w-20 flex-col items-center gap-1.5 text-center sm:w-24">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition"
            :class="
              currentStep >= index ? 'bg-primary-600 text-white' : 'border-2 border-gray-200 bg-white text-gray-400'
            "
          >
            <CheckIcon v-if="currentStep > index" class="h-4 w-4" />
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span
            class="whitespace-nowrap text-sm"
            :class="
              currentStep === index
                ? 'font-bold text-primary-600'
                : currentStep > index
                  ? 'text-primary-600'
                  : 'text-gray-400'
            "
          >
            {{ step }}
          </span>
        </li>
        <li
          v-if="index < steps.length - 1"
          aria-hidden="true"
          class="mt-[1.125rem] h-0.5 w-8 rounded-full sm:w-14"
          :class="currentStep > index ? 'bg-primary-600' : 'bg-gray-200'"
        ></li>
      </template>
    </ol>

    <!-- 步驟 1: 選擇服務（預設看全部，可切換分類；點了就進到選時間） -->
    <div v-if="currentStep === 0">
      <div class="mb-5 flex items-center justify-between gap-4">
        <label for="booking-category" class="text-sm text-gray-500">療程分類</label>
        <select
          id="booking-category"
          v-model="activeGroupId"
          class="w-48 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-cocoa focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option :value="0">全部（{{ services.length }}）</option>
          <option v-for="group in serviceGroups" :key="group.id" :value="group.id">
            {{ group.name }}（{{ group.services.length }}）
          </option>
        </select>
      </div>

      <section v-for="group in visibleGroups" :key="group.id" class="mb-8 last:mb-0">
        <h3 v-if="activeGroupId === 0" class="mb-3 text-sm font-semibold tracking-wide text-primary-500">
          {{ group.name }}
        </h3>
        <ul class="space-y-3">
          <li v-for="service in group.services" :key="service.id">
            <button
              type="button"
              class="group flex w-full items-center gap-6 rounded-2xl border bg-white px-5 py-5 text-left transition-colors sm:px-7 sm:py-6"
              :class="
                selectedService?.id === service.id
                  ? 'border-primary-400'
                  : 'border-transparent hover:border-primary-200'
              "
              @click="chooseService(service)"
            >
              <div class="min-w-0 flex-1">
                <p class="text-base font-bold text-cocoa transition-colors group-hover:text-primary-600 sm:text-lg">
                  {{ service.name }}
                </p>
                <p class="mt-1.5 text-sm text-gray-500">{{ service.duration }} 分鐘</p>
              </div>
              <p class="shrink-0 text-lg font-bold text-primary-600">
                <span class="text-sm font-medium">NT$</span> {{ Number(service.price).toLocaleString() }}
              </p>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- 步驟 2: 選擇時間 -->
    <div v-if="currentStep === 1" class="space-y-6 rounded-3xl bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold text-cocoa">選擇預約時間</h2>

      <!-- 已選療程 -->
      <div class="flex items-center justify-between gap-4 rounded-2xl bg-primary-50/60 px-5 py-4">
        <div class="min-w-0">
          <p class="truncate font-bold text-cocoa">{{ selectedService?.name }}</p>
          <p class="mt-0.5 flex gap-3 text-sm text-gray-500">
            <span>{{ selectedService?.duration }} 分鐘</span
            ><span>NT$ {{ Number(selectedService?.price).toLocaleString() }}</span>
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700"
          @click="currentStep = 0"
        >
          更換
        </button>
      </div>

      <!-- 美容師選擇 -->
      <div>
        <label class="block text-sm font-medium mb-2">選擇美容師</label>
        <select
          v-model="selectedStaff"
          class="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-primary-200 focus:border-primary-300 focus:outline-none"
        >
          <option :value="null">任何美容師</option>
          <option v-for="staff in staffList" :key="staff.id" :value="staff.id">
            {{ staff.name }} ({{ staff.years_experience }}年經驗)
          </option>
        </select>
      </div>

      <!-- 日期選擇 -->
      <div>
        <label class="block text-sm font-medium mb-2">選擇日期</label>
        <input
          v-model="selectedDate"
          type="date"
          :min="minDate"
          class="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-primary-200 focus:border-primary-300 focus:outline-none"
        />
      </div>

      <!-- 可預約時段 -->
      <p
        v-if="selectedDate && slotsLoaded && !availableSlots.length"
        class="rounded-2xl bg-primary-50/60 px-5 py-4 text-sm text-cocoa"
      >
        {{ slotMessage || '這天已經約滿，請換一天' }}
      </p>
      <div v-if="availableSlots.length">
        <label for="booking-time" class="block text-sm font-medium mb-2">可預約時段</label>
        <select
          id="booking-time"
          v-model="selectedTime"
          class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="" disabled>請選擇時段（共 {{ availableSlots.length }} 個）</option>
          <option v-for="slot in availableSlots" :key="slot" :value="slot">{{ slot }}</option>
        </select>
      </div>

      <div class="flex gap-4 pt-2">
        <button @click="currentStep = 0" class="btn-cute-outline flex-1">上一步</button>
        <button
          @click="currentStep = 2"
          :disabled="!selectedTime"
          class="btn-cute flex-1 disabled:opacity-50 disabled:pointer-events-none"
        >
          下一步
        </button>
      </div>
    </div>

    <!-- 步驟 3: 確認資訊 -->
    <div v-if="currentStep === 2" class="space-y-6 rounded-3xl bg-white p-6 sm:p-8">
      <h2 class="text-xl font-semibold text-cocoa">確認預約資訊</h2>

      <div class="space-y-3 rounded-2xl bg-primary-50/60 p-5">
        <div class="flex justify-between">
          <span class="text-gray-600">服務項目</span>
          <span class="font-medium">{{ selectedService?.name }}</span>
        </div>

        <div class="flex justify-between">
          <span class="text-gray-600">日期</span>
          <span class="font-medium">{{ formatDate(selectedDate) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">時間</span>
          <span class="font-medium">{{ selectedTime }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">時長</span>
          <span class="font-medium">{{ selectedService?.duration }}分鐘</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">美容師</span>
          <span class="font-medium">{{ staffList.find((s) => s.id === selectedStaff)?.name || '由店家安排' }}</span>
        </div>
        <div class="space-y-2 border-t border-dashed border-primary-200 pt-3">
          <div class="flex justify-between">
            <span class="text-gray-600">原價</span>
            <span class="font-medium">NT$ {{ Number(selectedService?.price).toLocaleString() }}</span>
          </div>
          <div v-if="coupon" class="flex justify-between text-primary-600">
            <span>優惠碼 {{ coupon.code }}（{{ coupon.name }}）</span>
            <span class="font-medium">－NT$ {{ coupon.discount.toLocaleString() }}</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-bold text-cocoa">應付金額</span>
            <span class="text-2xl font-bold text-primary-600"
              >NT$ {{ (Number(selectedService?.price) - (coupon?.discount || 0)).toLocaleString() }}</span
            >
          </div>
        </div>
      </div>

      <!-- 優惠券：從券夾選，或輸入優惠碼 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label for="coupon-select" class="block text-sm font-medium"
            >優惠券 <span class="ml-1 text-xs text-gray-400">選填</span></label
          >
          <router-link to="/coupons" class="text-xs font-medium text-primary-600 hover:text-primary-700"
            >去領券中心</router-link
          >
        </div>
        <select
          id="coupon-select"
          :value="coupon?.code || ''"
          class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
          @change="selectCoupon(($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            {{ usableCoupons.length ? `不使用優惠券（有 ${usableCoupons.length} 張可用）` : '沒有可用的優惠券' }}
          </option>
          <option v-for="c in usableCoupons" :key="c.code" :value="c.code">
            {{ c.name }}（折 NT$ {{ c.discount.toLocaleString() }}）
          </option>
          <option v-if="coupon && !usableCoupons.some((c) => c.code === coupon!.code)" :value="coupon.code">
            {{ coupon.name }}（折 NT$ {{ coupon.discount.toLocaleString() }}）
          </option>
        </select>
        <div v-if="!coupon" class="flex gap-2">
          <input
            id="coupon-code"
            v-model.trim="couponInput"
            placeholder="或輸入優惠碼"
            aria-label="優惠碼"
            class="w-full rounded-xl border border-gray-200 px-3 py-2.5 uppercase focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-200"
            @keydown.enter.prevent="applyCoupon()"
          />
          <button
            type="button"
            class="btn-cute-outline shrink-0 !px-5 !py-2.5"
            :disabled="!couponInput || couponChecking"
            @click="applyCoupon()"
          >
            <LoadingSpinner v-if="couponChecking" size="sm" />
            <template v-else>套用</template>
          </button>
        </div>
      </div>

      <!-- 聯絡資訊 -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">
            姓名 <span class="ml-1 text-xs text-red-500">必填</span>
          </label>
          <input
            v-model="customerName"
            type="text"
            placeholder="您的姓名"
            class="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-primary-200 focus:border-primary-300 focus:outline-none"
            :class="{ 'border-red-500': showErrors && !customerName.trim() }"
          />
          <p v-if="showErrors && !customerName.trim()" class="text-red-500 text-xs mt-1">請填寫姓名</p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            聯絡電話 <span class="ml-1 text-xs text-red-500">必填</span>
          </label>
          <input
            v-model="customerPhone"
            type="tel"
            placeholder="您的聯絡電話"
            class="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-primary-200 focus:border-primary-300 focus:outline-none"
            :class="{ 'border-red-500': showErrors && phoneError }"
          />
          <p v-if="showErrors && phoneError" class="text-red-500 text-xs mt-1">{{ phoneError }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            備註 <span class="ml-1 text-xs text-gray-400">選填</span>
          </label>
          <textarea
            v-model="notes"
            placeholder="備註..."
            rows="3"
            class="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-primary-200 focus:border-primary-300 focus:outline-none"
          ></textarea>
        </div>
      </div>

      <div class="flex gap-4 pt-2">
        <button @click="currentStep = 1" class="btn-cute-outline flex-1">上一步</button>
        <button
          @click="submitBooking"
          :disabled="loading"
          class="btn-cute flex-1 disabled:opacity-50 disabled:pointer-events-none"
        >
          <LoadingSpinner v-if="loading" size="sm" />
          <template v-else>確認預約</template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useServicesStore } from '@/stores/services'
import apiClient from '@/api/client'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { CheckIcon } from '@heroicons/vue/24/solid'
import { isValidTaiwanPhone, normalizeTaiwanPhone } from '@/utils/phone'
import { todayLocal, rejectPastDate, PAST_DATE_MESSAGE } from '@/utils/appointmentTime'

const authStore = useAuthStore()
const servicesStore = useServicesStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

const steps = ['選擇服務', '選擇時間', '確認預約']
const currentStep = ref(0)

// 服務相關
const services = computed(() => servicesStore.services)
const selectedService = ref<any>(null)

// 第 1 步：依分類分組
const serviceGroups = computed(() => {
  const groups: { id: number; name: string; services: any[] }[] = []
  for (const s of services.value) {
    let group = groups.find((g) => g.id === s.category_id)
    if (!group) {
      group = { id: s.category_id, name: s.category_name || '其他', services: [] }
      groups.push(group)
    }
    group.services.push(s)
  }
  return groups
})

// 0 代表「全部療程」，依分類分段列出
const activeGroupId = ref(0)
const visibleGroups = computed(() =>
  activeGroupId.value === 0 ? serviceGroups.value : serviceGroups.value.filter((g) => g.id === activeGroupId.value)
)
// 選的分類不存在（例如被下架）就回到全部
watch(serviceGroups, (groups) => {
  if (activeGroupId.value && !groups.some((g) => g.id === activeGroupId.value)) activeGroupId.value = 0
})

// 選了服務就直接進到選時間
const chooseService = (service: any) => {
  selectedService.value = service
  currentStep.value = 1
}

// 美容師相關
const staffList = ref<any[]>([])
const selectedStaff = ref<number | null>(null)

// 時間相關
const selectedDate = ref('')
const selectedTime = ref('')
const availableSlots = ref<string[]>([])
const minDate = todayLocal()

// 選到過去的日期：提醒並退回
watch(selectedDate, (value, previous) => {
  const fallback = rejectPastDate(value, previous)
  if (fallback === null) return
  toast.warning(PAST_DATE_MESSAGE)
  selectedDate.value = fallback
})

// 客戶資訊
const customerName = ref(authStore.user?.name || '')
const customerPhone = ref(authStore.user?.phone || '')
const notes = ref('')
const loading = ref(false)
const showErrors = ref(false)

const phoneError = computed(() => {
  if (!customerPhone.value.trim()) return '請填寫聯絡電話，方便我們聯繫您'
  if (!isValidTaiwanPhone(customerPhone.value)) {
    return '電話格式不正確：手機為 09 開頭共 10 碼，市話請加區碼（例如 02-2345-6789）'
  }
  return ''
})

// 載入資料
onMounted(async () => {
  await servicesStore.fetchServices()

  // 從服務介紹頁點「預約這個療程」過來時，直接帶入該服務
  const presetId = Number(route.query.serviceId)
  if (presetId) {
    selectedService.value = services.value.find((s) => s.id === presetId) || null
    // 帶著療程過來就直接從選時間開始
    if (selectedService.value) {
      activeGroupId.value = selectedService.value.category_id
      currentStep.value = 1
    }
  }

  // 載入美容師列表
  try {
    const response = (await apiClient.get('/staff')) as any
    if (response.success) {
      staffList.value = response.data || []
    }
  } catch (error) {
    console.error('Failed to load staff:', error)
  }

  // 會員有設定指定美容師就先選好
  const preferred = (authStore.user as any)?.preferred_staff_id
  if (preferred && staffList.value.some((s) => s.id === preferred)) {
    selectedStaff.value = preferred
  }
})

// 監聽日期變化，載入可預約時段
watch([selectedDate, selectedStaff], async () => {
  selectedTime.value = ''
  availableSlots.value = []
  slotsLoaded.value = false
  slotMessage.value = ''
  if (!selectedDate.value || !selectedService.value) return

  try {
    const response = (await apiClient.get('/appointments/available', {
      params: {
        date: selectedDate.value,
        serviceId: selectedService.value.id,
        staffId: selectedStaff.value || undefined
      }
    })) as any
    if (response.success) {
      availableSlots.value = response.data || []
      slotMessage.value = response.message || ''
    }
  } catch (error) {
    console.error('Failed to load available slots:', error)
  } finally {
    slotsLoaded.value = true
  }
})

const slotsLoaded = ref(false)
const slotMessage = ref('')

// ---- 優惠碼：先試算，送出預約時後端會再檢查一次
const couponInput = ref('')
const coupon = ref<{ code: string; name: string; discount: number } | null>(null)
const couponChecking = ref(false)

const myCoupons = ref<any[]>([])
// 券夾裡這個療程能用的
const usableCoupons = computed(() => myCoupons.value.filter((c) => c.status === 'available' && c.discount !== null))

const loadMyCoupons = async () => {
  if (!authStore.isLoggedIn || !selectedService.value) return
  try {
    const res = (await apiClient.get('/coupons/mine', { params: { serviceId: selectedService.value.id } })) as any
    myCoupons.value = res.data || []
  } catch {
    myCoupons.value = []
  }
}

const selectCoupon = (code: string) => {
  if (code) applyCoupon(code)
  else removeCoupon()
}

const applyCoupon = async (code = couponInput.value) => {
  if (!code || !selectedService.value) return
  couponChecking.value = true
  try {
    const res = (await apiClient.post('/appointments/coupon', { code, serviceId: selectedService.value.id })) as any
    coupon.value = res.data
    toast.success(`已折抵 NT$ ${res.data.discount.toLocaleString()}`)
  } catch (error: any) {
    toast.warning(error?.message || '優惠碼無法使用')
  } finally {
    couponChecking.value = false
  }
}

const removeCoupon = () => {
  coupon.value = null
  couponInput.value = ''
}

// 換療程後折扣金額會不同，要重新套用
watch(selectedService, removeCoupon)
// 進到確認頁才載入券夾
watch(currentStep, (step) => {
  if (step === 2) loadMyCoupons()
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

const submitBooking = async () => {
  if (!authStore.isLoggedIn) {
    router.push('/login?redirect=/booking')
    return
  }

  if (!customerName.value.trim() || phoneError.value) {
    showErrors.value = true
    toast.warning(!customerName.value.trim() ? '請填寫姓名' : phoneError.value)
    return
  }

  loading.value = true
  try {
    const response = (await apiClient.post('/appointments', {
      serviceId: selectedService.value.id,
      staffId: selectedStaff.value || null,
      couponCode: coupon.value?.code,
      date: selectedDate.value,
      time: selectedTime.value,
      customerName: customerName.value,
      customerPhone: normalizeTaiwanPhone(customerPhone.value),
      notes: notes.value
    })) as any

    if (response.success) {
      toast.success('預約成功！')
      router.push('/appointments')
    }
  } catch (error: any) {
    console.error('Booking failed:', error)
    toast.error(error?.message || '預約失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}
</script>
