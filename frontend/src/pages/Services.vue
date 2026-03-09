<template>
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">服務項目</h1>
    
    <!-- 分類篩選 -->
    <div class="flex gap-2 mb-8 overflow-x-auto pb-2">
      <button
        v-for="category in categories"
        :key="category.id"
        @click="selectedCategory = category.id"
        class="px-4 py-2 rounded-full whitespace-nowrap transition"
        :class="selectedCategory === category.id 
          ? 'bg-primary-600 text-white' 
          : 'bg-gray-100 hover:bg-gray-200'"
      >
        {{ category.name }}
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="text-center py-12">
      <LoadingSpinner />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ServiceCard
        v-for="service in filteredServices"
        :key="service.id"
        :service="service"
        @click="selectService(service)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServicesStore } from '@/stores/services'
import ServiceCard from '@/components/common/ServiceCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useRouter } from 'vue-router'


const servicesStore = useServicesStore()
const selectedCategory = ref<number>()
const loading = ref(false)
const router = useRouter()

const categories = computed(() => servicesStore.categories)

const filteredServices = computed(() => {
  if (!selectedCategory.value) return servicesStore.services
  return servicesStore.services.filter(s => s.category_id === selectedCategory.value)
})

onMounted(async () => {
  loading.value = true
  await Promise.all([
    servicesStore.fetchServices(),
    servicesStore.fetchCategories()
  ])
  loading.value = false
})

const selectService = (service: any) => {
  router.push(`/services/${service.id}`)
}
</script>
