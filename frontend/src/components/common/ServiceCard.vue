<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
  @click="goToDetail"
  >
    <img 
      :src="service.image_url || 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'" 
      :alt="service.name"
      class="w-full h-48 object-cover"
    />
    <div class="p-4">
      <h3 class="font-semibold text-lg mb-2">{{ service.name }}</h3>
      <p class="text-gray-600 text-sm mb-3">{{ service.description }}</p>
      <div class="flex justify-between items-center">
        <span class="text-primary-600 font-bold">NT$ {{ Number(service.price).toLocaleString() }}</span>
        <span class="text-sm text-gray-500">{{ service.duration }}分鐘</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  service: {
    id: number
    name: string
    description: string
    price: number
    duration: number
    image_url?: string
  }
}>()

const goToDetail = () => {
  router.push(`/services/${props.service.id}`)
}
</script>
