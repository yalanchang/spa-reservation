<template>
  <nav class="sticky top-0 z-50 bg-white border-b border-primary-100">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <router-link to="/" class="text-xl font-extrabold text-primary-600 flex-shrink-0">
          美容預約系統
        </router-link>

        <div class="hidden sm:flex items-center gap-1">
          <router-link to="/services" class="nav-pill hover-bold" data-text="服務項目">服務項目</router-link>
          <router-link to="/favorites" class="nav-pill hover-bold" data-text="我的收藏">我的收藏</router-link>
          <router-link to="/coupons" class="nav-pill hover-bold" data-text="領券中心">領券中心</router-link>
          <router-link to="/booking" class="nav-pill hover-bold" data-text="立即預約">立即預約</router-link>
          <router-link v-if="authStore.isLoggedIn" to="/appointments" class="nav-pill hover-bold" data-text="我的預約">我的預約</router-link>

          <template v-if="authStore.isLoggedIn">
            <NotificationBell />
            <!-- 頭像選單：登出收在裡面，避免誤按 -->
            <div ref="accountMenu" class="relative ml-1">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary-100 ring-2 transition"
                :class="accountOpen ? 'ring-primary-300' : 'ring-white hover:ring-primary-200'"
                aria-label="帳號選單"
                aria-haspopup="menu"
                :aria-expanded="accountOpen"
                @click="accountOpen = !accountOpen"
              >
                <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="" class="h-full w-full object-cover" />
                <span v-else class="text-sm text-primary-600">{{ authStore.user?.name?.charAt(0) }}</span>
              </button>
              <div
                v-if="accountOpen"
                class="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-primary-100 bg-white py-2 shadow-soft"
                role="menu"
              >
                <div class="border-b border-primary-50 px-4 pb-2.5 pt-1">
                  <p class="truncate font-semibold text-cocoa">{{ authStore.user?.name }}</p>
                  <p class="truncate text-xs text-gray-500">{{ authStore.user?.email }}</p>
                </div>
                <router-link
                  v-for="item in ACCOUNT_LINKS"
                  :key="item.label"
                  :to="item.to"
                  class="block px-4 py-2.5 text-sm text-cocoa hover:text-primary-600"
                  role="menuitem"
                  @click="accountOpen = false"
                >
                  {{ item.label }}
                </router-link>
                <div class="mt-1 border-t border-primary-50 pt-1">
                  <button type="button" class="block w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:text-cocoa" role="menuitem" @click="handleLogout">
                    登出
                  </button>
                </div>
              </div>
            </div>
          </template>

          <router-link
            v-else
            to="/login"
            class="btn-cute ml-2 px-5 py-2"
          >
            登入
          </router-link>
        </div>

        <div class="sm:hidden flex items-center gap-2">
          <NotificationBell v-if="authStore.isLoggedIn" />
          <button
            class="flex flex-col justify-center items-center w-8 h-8 space-y-1.5 focus:outline-none"
            @click="menuOpen = true"
            aria-label="開啟選單"
          >
            <span class="block w-6 h-0.5 bg-gray-700" />
            <span class="block w-6 h-0.5 bg-gray-700" />
            <span class="block w-6 h-0.5 bg-gray-700" />
          </button>
        </div>
      </div>
    </div>

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
        <div class="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
          <span class="text-lg font-extrabold text-primary-600">美容預約系統</span>
          <button
            @click="menuOpen = false"
            class="w-8 h-8 flex items-center justify-center rounded-full transition hover:font-bold"
            aria-label="關閉選單"
          >
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="authStore.isLoggedIn" class="flex items-center space-x-3 px-5 py-5 border-b border-gray-100">
          <div class="w-12 h-12 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
            <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" alt="" class="w-full h-full object-cover" />
            <span v-else class="text-primary-600 text-lg font-semibold">
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
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 transition hover:font-bold"
            @click="menuOpen = false"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span class="font-medium">服務項目</span>
          </router-link>


          <router-link
            to="/booking"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 transition hover:font-bold"
            @click="menuOpen = false"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="font-medium">立即預約</span>
          </router-link>


          <router-link
            to="/coupons"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 transition hover:font-bold"
            @click="menuOpen = false"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
            <span class="font-medium">領券中心</span>
          </router-link>

          <router-link
            to="/favorites"
            class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 transition hover:font-bold"
            @click="menuOpen = false"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span class="font-medium">我的收藏</span>
          </router-link>

          <template v-if="authStore.isLoggedIn">
            <router-link
              to="/appointments"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 transition hover:font-bold"
              @click="menuOpen = false"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="font-medium">我的預約</span>
            </router-link>
            <router-link
              to="/profile"
              class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 transition hover:font-bold"
              @click="menuOpen = false"
            >
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="font-medium">個人資料</span>
            </router-link>
          </template>
        </div>

        <div class="px-4 py-5 border-t border-gray-100 flex-shrink-0">
          <template v-if="authStore.isLoggedIn">
            <button
              class="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-gray-300 text-gray-700 transition hover:font-bold"
              @click="handleLogout"
            >
             
              <span class="font-medium">登出</span>
            </button>
          </template>
          <template v-else>
            <router-link
              to="/login"
              class="btn-cute w-full py-2.5"
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import NotificationBell from '@/components/layout/NotificationBell.vue'

const ACCOUNT_LINKS = [
  { to: '/profile', label: '個人資料' },
  { to: '/appointments', label: '我的預約' },
  { to: { path: '/profile', query: { tab: 'coupons' } }, label: '我的優惠券' },
  { to: '/favorites', label: '我的收藏' }
]

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)

// 頭像選單：點外面、按 Esc、換頁都會關掉
const accountOpen = ref(false)
const accountMenu = ref<HTMLElement | null>(null)
const onDocumentClick = (e: MouseEvent) => {
  if (accountOpen.value && !accountMenu.value?.contains(e.target as Node)) accountOpen.value = false
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') accountOpen.value = false
}
watch(() => route.fullPath, () => { accountOpen.value = false })
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

const handleLogout = async () => {
  menuOpen.value = false
  accountOpen.value = false
  await authStore.logout()
  router.push('/')
}
</script>

<style scoped>
.nav-pill {
  @apply rounded-full px-4 py-2 text-cocoa;
}
.nav-pill.router-link-active {
  @apply font-bold text-primary-600;
}
</style>
