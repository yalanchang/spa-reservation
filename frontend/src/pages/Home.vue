<template>
  <div class="space-y-12">
    <!-- Hero Section -->
    <section class="text-center py-12 bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">放鬆身心，煥發美麗</h1>
      <p class="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8">
  專業美容服務，為您打造專屬的美麗時光
</p>      <router-link 
        to="/booking" 
        class="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary-700 transition"
      >
        立即預約
      </router-link>
    </section>

    <!-- 服務特色 -->
    <section class="py-12">
      <h2 class="text-3xl font-bold text-center mb-8">我們的服務</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="feature in features" :key="feature.title" 
             class="bg-white p-6 rounded-xl shadow-md text-center">
          <h3 class="text-xl font-semibold mb-2">{{ feature.title }}</h3>
          <p class="text-gray-600">{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <section class="py-12">
      <h2 class="text-3xl font-bold text-center mb-8">熱門服務</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ServiceCard
          v-for="service in popularServices"
          :key="service.id"
          :service="service"
          @click="goToDetail(service)"

        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import ServiceCard from '@/components/common/ServiceCard.vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const goToDetail = (service: any) => {
  router.push(`/services/${service.id}`)
}

const features = [
  {
    title: '專業技術',
    description: '由經驗豐富的美容師提供專業服務'
  },
  {
    title: '頂級產品',
    description: '選用國際知名品牌，呵護您的肌膚'
  },
  {
    title: '舒適環境',
    description: '打造放鬆舒適的美容空間'
  }
]

const popularServices = [
  {
    id: 1,
    name: '基礎臉部護理',
    description: '深層清潔、去角質、保濕導入',
    price: 1500,
    duration: 60,
    image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 2,
    name: '精油按摩',
    description: '舒緩肌肉緊繃，釋放壓力',
    price: 1800,
    duration: 90,
    image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 3,
    name: '身體去角質',
    description: '溫和去除老廢角質，肌膚煥然一新',
    price: 2000,
    duration: 60,
    image_url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'
  }
]
</script>
