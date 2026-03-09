<template>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">預約服務</h1>

    <!-- 步驟指示器 -->
    <div class="flex mb-8">
      <div 
        v-for="(step, index) in steps" 
        :key="index"
        class="flex-1 text-center"
        :class="{
          'text-primary-600 font-bold': currentStep === index,
          'text-gray-400': currentStep < index
        }"
      >
        <div class="relative">
          <div 
            class="w-10 h-10 mx-auto rounded-full flex items-center justify-center border-2"
            :class="{
              'bg-primary-600 text-white border-primary-600': currentStep >= index,
              'border-gray-300': currentStep < index
            }"
          >
            <span v-if="currentStep > index">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
       <div 
  v-if="index < steps.length - 1"
  class="absolute top-5 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5"
  :class="currentStep > index ? 'bg-primary-600' : 'bg-gray-300'"
></div>
        </div>
        <div class="mt-2 text-sm">{{ step }}</div>
      </div>
    </div>

    <!-- 步驟 1: 選擇服務 -->
    <div v-if="currentStep === 0" class="space-y-4">
      <h2 class="text-xl font-semibold mb-4">選擇服務項目</h2>
      
      <div class="grid grid-cols-1 gap-4">
        <div
          v-for="service in services"
          :key="service.id"
          @click="selectedService = service"
          class="border rounded-lg p-4 cursor-pointer transition"
          :class="selectedService?.id === service.id 
            ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600' 
            : 'hover:border-gray-300'"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-lg">{{ service.name }}</h3>
              <p class="text-gray-600 text-sm mt-1">{{ service.description }}</p>
            </div>
            <div class="text-right">
              <div class="text-primary-600 font-bold"> NT$ {{ Number(service.price).toLocaleString() }}</div>
             
              <div class="text-sm text-gray-500">{{ service.duration }}分鐘</div>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="currentStep = 1"
        :disabled="!selectedService"
        class="w-full mt-6 bg-primary-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-primary-700"
      >
        下一步
      </button>
    </div>

    <!-- 步驟 2: 選擇時間 -->
    <div v-if="currentStep === 1" class="space-y-4">
      <h2 class="text-xl font-semibold mb-4">選擇預約時間</h2>
      
      <!-- 美容師選擇 -->
      <div>
        <label class="block text-sm font-medium mb-2">選擇美容師</label>
        <select 
          v-model="selectedStaff"
          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <!-- 可預約時段 -->
      <div v-if="availableSlots.length" class="space-y-2">
        <label class="block text-sm font-medium">可預約時段</label>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="slot in availableSlots"
            :key="slot"
            @click="selectedTime = slot"
            class="p-2 border rounded-lg text-center hover:bg-gray-50 transition"
            :class="selectedTime === slot ? 'bg-primary-600 text-white hover:bg-primary-700' : ''"
          >
            {{ slot }}
          </button>
        </div>
      </div>

      <div class="flex gap-4 mt-6">
        <button
          @click="currentStep = 0"
          class="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
        >
          上一步
        </button>
        <button
          @click="currentStep = 2"
          :disabled="!selectedTime"
          class="flex-1 bg-primary-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-primary-700"
        >
          下一步
        </button>
      </div>
    </div>

    <!-- 步驟 3: 確認資訊 -->
    <div v-if="currentStep === 2" class="space-y-4">
      <h2 class="text-xl font-semibold mb-4">確認預約資訊</h2>
      
      <div class="bg-gray-50 p-4 rounded-lg space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-600">服務項目</span>
          <span class="font-medium">{{ selectedService?.name }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600">價格</span>
          <span class="font-medium"> NT$ {{ Number(selectedService?.price).toLocaleString() }}</span>
         
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
      </div>

      <!-- 聯絡資訊 -->
      <div class="space-y-3">
        <input
          v-model="customerName"
          type="text"
          placeholder="您的姓名"
          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          required
        />
        <input
          v-model="customerPhone"
          type="tel"
          placeholder="聯絡電話"
          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          required
        />
        <textarea
          v-model="notes"
          placeholder="備註 (選擇性)"
          rows="3"
          class="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        ></textarea>
      </div>

      <div class="flex gap-4 mt-6">
        <button
          @click="currentStep = 1"
          class="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50"
        >
          上一步
        </button>
        <button
          @click="submitBooking"
          :disabled="loading || !customerName || !customerPhone"
          class="flex-1 bg-primary-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-primary-700"
        >
          {{ loading ? '處理中...' : '確認預約' }}
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
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const servicesStore = useServicesStore()
const router = useRouter()

const steps = ['選擇服務', '選擇時間', '確認預約']
const currentStep = ref(0)

// 服務相關
const services = computed(() => servicesStore.services)
const selectedService = ref<any>(null)

// 美容師相關
const staffList = ref<any[]>([])
const selectedStaff = ref<number | null>(null)

// 時間相關
const selectedDate = ref('')
const selectedTime = ref('')
const availableSlots = ref<string[]>([])
const minDate = new Date().toISOString().split('T')[0]

// 客戶資訊
const customerName = ref(authStore.user?.name || '')
const customerPhone = ref('')
const notes = ref('')
const loading = ref(false)

// 載入資料
onMounted(async () => {
  await servicesStore.fetchServices()
  
  // 載入美容師列表
  try {
    const response = await apiClient.get('/staff')
    if (response.success) {
      staffList.value = response.data || []
    }
  } catch (error) {
    console.error('Failed to load staff:', error)
  }
})

// 監聽日期變化，載入可預約時段
watch([selectedDate, selectedStaff], async () => {
  if (!selectedDate.value || !selectedService.value) return
  
  try {
    const response = await apiClient.get('/appointments/available', {
      params: {
        date: selectedDate.value,
        serviceId: selectedService.value.id,
        staffId: selectedStaff.value
      }
    })
    if (response.success) {
      availableSlots.value = response.data || []
    }
  } catch (error) {
    console.error('Failed to load available slots:', error)
  }
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

  loading.value = true
  try {
    const response = await apiClient.post('/appointments', {
      serviceId: selectedService.value.id,
      staffId: selectedStaff.value || 1,
      date: selectedDate.value,
      time: selectedTime.value,
      customerName: customerName.value,
      customerPhone: customerPhone.value,
      notes: notes.value
    })
    
    if (response.success) {
      alert('預約成功！')
      router.push('/appointments')
    }
  } catch (error) {
    console.error('Booking failed:', error)
    alert('預約失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}
</script>
