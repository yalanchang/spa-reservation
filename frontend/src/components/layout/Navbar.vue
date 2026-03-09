<template>
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="text-xl font-bold text-primary-600">
            美容預約系統
          </router-link>
        </div>
        
        <div class="flex items-center space-x-4">
          <router-link to="/services" class="text-gray-700 hover:text-primary-600">
            服務項目
          </router-link>
          <router-link to="/booking" class="text-gray-700 hover:text-primary-600">
            立即預約
          </router-link>
          
          <template v-if="authStore.isLoggedIn">
            <router-link to="/profile" class="flex items-center space-x-2 text-gray-700 hover:text-primary-600">
              <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span class="text-primary-600 text-sm">
                  {{ authStore.user?.name?.charAt(0) }}
                </span>
              </div>
              <span>{{ authStore.user?.name }}</span>
            </router-link>
            <button 
              @click="handleLogout"
              class="text-gray-700 hover:text-primary-600"
            >
              登出
            </button>
          </template>
          
          <router-link 
            v-else
            to="/login" 
            class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            登入
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>
