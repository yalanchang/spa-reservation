<template>
    <div class="max-w-4xl mx-auto">
      <button
        class="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition"
        @click="router.back()"
      >
        ← 返回服務列表
      </button>
  
      <div v-if="loading" class="text-center py-20">
        <LoadingSpinner />
      </div>
  
      <div v-else-if="!service" class="text-center py-20 text-gray-500">
        服務不存在
      </div>
  
      <div v-else class="bg-white rounded-lg shadow-lg overflow-hidden">
        <img
          :src="service.image_url || 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'"
          :alt="service.name"
          class="w-full h-64 object-cover"
        />
  
        <div class="p-8">
          <!-- 標題 -->
          <div class="flex justify-between items-start mb-6">
            <div>
              <span class="inline-block px-3 py-1 bg-primary-100 text-primary-600 text-sm rounded-full mb-3">
                {{ service.category_name }}
              </span>
              <h1 class="text-3xl font-bold">{{ service.name }}</h1>
            </div>
            <div class="text-right">
              <div class="text-3xl font-bold text-primary-600">NT$ {{ Number(service.price).toLocaleString() }}</div>
              <div class="text-gray-500 mt-1">⏱ {{ service.duration }} 分鐘</div>
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
            <button
              class="w-full py-4 bg-primary-600 text-white text-lg font-semibold rounded-lg hover:bg-primary-700 transition"
              @click="goToBooking"
            >
              立即預約
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import apiClient from '@/api/client'
  import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
  
  const route = useRoute()
  const router = useRouter()
  const service = ref<any>(null)
  const loading = ref(true)
  
  onMounted(async () => {
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