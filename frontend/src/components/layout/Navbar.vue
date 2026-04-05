<template>
  <nav class="bg-white shadow-lg relative z-50">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <router-link to="/" class="text-xl font-bold text-primary-600 flex-shrink-0">
          美容預約系統
        </router-link>

        <!-- 桌面選單 -->
        <div class="hidden sm:flex items-center space-x-4">
          <router-link to="/services" class="text-gray-700 hover:text-primary-600">
            服務項目
          </router-link>
          <router-link to="/booking" class="text-gray-700 hover:text-primary-600">
            立即預約
          </router-link>

          <template v-if="authStore.isLoggedIn">
            <router-link
              to="/profile"
              class="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
            >
              <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-primary-600 text-sm">{{ authStore.user?.name?.charAt(0) }}</span>
              </div>
              <span>{{ authStore.user?.name }}</span>
            </router-link>
            <button @click="handleLogout" class="text-gray-700 hover:text-primary-600">
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

        <!-- 漢堡按鈕（手機） -->
        <button
          class="sm:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5 focus:outline-none"
          @click="menuOpen = true"
          aria-label="開啟選單"
        >
          <span class="block w-6 h-0.5 bg-gray-700" />
          <span class="block w-6 h-0.5 bg-gray-700" />
          <span class="block w-6 h-0.5 bg-gray-700" />
        </button>
      </div>
    </div>

    <!-- 遮罩 -->
    <transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="menuOpen"
        class="fixed inset-0 bg-black bg-opacity-40 z-40 sm:hidden"
        @click="menuOpen = false"
      />
    </transition>

    <!-- 右側抽屜 -->
    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-300 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="menuOpen"
        class="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col sm:hidden"
      >
        <!-- 抽屜標題列 -->
        <div class="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
          <span class="text-lg font-bold text-primary-600">美容預約系統</span>
          <button
            @click="menuOpen = false"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            aria-label="關閉選單"
          >
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 使用者資訊（登入後） -->
        <div v-if="authStore.isLoggedIn" class="flex items-center space-x-3 px-5 py-5 border-b border-gray-100">
          <div class="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-primary-600 text-lg font-semibold">
              {{ authStore.user?.name?.charAt(0) }}
            </span>
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-gray-800 truncate">{{ authStore.user?.name }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
          </div>
        </div>

        <!-- 選單項目 -->
        <div class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <router-link
            to="/services"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition"
            @click="menuOpen = false"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span class="font-medium">服務項目</span>
          </router-link>

          <router-link
            to="/booking"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition"
            @click="menuOpen = false"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="font-medium">立即預約</span>
          </router-link>

          <template v-if="authStore.isLoggedIn">
            <router-link
              to="/profile"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition"
              @click="menuOpen = false"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="font-medium">個人資料</span>
            </router-link>
          </template>
        </div>

        <!-- 底部按鈕 -->
        <div class="px-4 py-5 border-t border-gray-100 flex-shrink-0">
          <template v-if="authStore.isLoggedIn">
            <button
              class="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              @click="handleLogout"
            >
             
              <span class="font-medium">登出</span>
            </button>
          </template>
          <template v-else>
            <router-link
              to="/login"
              class="block w-full text-center bg-primary-600 text-white py-2.5 rounded-xl hover:bg-primary-700 transition font-medium"
              @click="menuOpen = false"
            >
              登入
            </router-link>
          </template>
        </div>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)

const handleLogout = async () => {
  menuOpen.value = false
  await authStore.logout()
  router.push('/')
}
</script>