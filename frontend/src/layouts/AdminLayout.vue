<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 lg:flex">
    <aside class="hidden lg:flex lg:w-56 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
      <div class="flex h-14 items-center border-b border-gray-200 px-5">
        <span class="font-semibold text-gray-900">美容預約系統</span>
        <span class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">後台</span>
      </div>

      <nav class="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        <div v-for="group in menuGroups" :key="group.label">
          <p class="px-3 pb-1 text-xs text-gray-400">{{ group.label }}</p>
          <div class="space-y-0.5">
            <router-link
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              active-class="!bg-gray-100 !text-gray-900 font-medium"
            >
              <component :is="item.icon" class="h-5 w-5 text-gray-400" />
              <span class="flex-1">{{ item.label }}</span>
              <span v-if="item.badge" class="rounded-full bg-red-500 px-1.5 text-xs leading-5 text-white">{{
                item.badge
              }}</span>
            </router-link>
          </div>
        </div>
      </nav>

      <div class="border-t border-gray-200 p-3 text-sm">
        <p class="truncate px-3 py-1 text-gray-500">{{ authStore.user?.name }}（{{ roleLabel }}）</p>
        <router-link to="/" class="block rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100">回到前台</router-link>
        <button class="block w-full rounded-md px-3 py-2 text-left text-gray-600 hover:bg-gray-100" @click="logout">
          登出
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col lg:pl-56">
      <header class="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div class="flex h-14 items-center justify-between px-4 lg:px-6">
          <h1 class="font-semibold text-gray-900">{{ route.meta.title }}</h1>
          <div class="flex items-center gap-3 text-sm lg:hidden">
            <router-link to="/" class="text-gray-500 hover:text-gray-900">回到前台</router-link>
            <button class="text-gray-500 hover:text-gray-900" @click="logout">登出</button>
          </div>
        </div>
        <!-- 手機：下拉選單切換頁面 -->
        <div class="px-4 pb-3 lg:hidden">
          <select
            :value="route.path"
            class="admin-input"
            aria-label="切換頁面"
            @change="router.push(($event.target as HTMLSelectElement).value)"
          >
            <optgroup v-for="group in menuGroups" :key="group.label" :label="group.label">
              <option v-for="item in group.items" :key="item.to" :value="item.to">
                {{ item.label }}{{ item.badge ? `（${item.badge}）` : '' }}
              </option>
            </optgroup>
          </select>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  UsersIcon,
  SparklesIcon,
  IdentificationIcon,
  CalendarIcon,
  TicketIcon,
  MegaphoneIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useAdminStats } from '@/composables/useAdminStats'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { stats, refresh } = useAdminStats()

const roleLabel = computed(() => (authStore.user?.role === 'admin' ? '管理員' : '美容師'))

const isAdmin = computed(() => authStore.user?.role === 'admin')

// 側邊欄分組；美容師只看得到日常營運的頁面
const menuGroups = computed(() => {
  const groups = [
    {
      label: '日常營運',
      items: [
        {
          to: '/admin/appointments',
          label: '預約管理',
          icon: CalendarDaysIcon,
          badge: (stats.value?.pending || 0) + (stats.value?.toFinish || 0)
        },
        { to: '/admin/reviews', label: '心得管理', icon: ChatBubbleLeftRightIcon, badge: stats.value?.unreplied || 0 },
        { to: '/admin/customers', label: '會員管理', icon: UsersIcon, badge: 0 }
      ]
    }
  ]
  if (!isAdmin.value) return groups
  return [
    ...groups,
    {
      label: '店務設定',
      items: [
        { to: '/admin/services', label: '療程管理', icon: SparklesIcon, badge: 0 },
        { to: '/admin/staff', label: '美容師與排班', icon: IdentificationIcon, badge: 0 },
        { to: '/admin/closures', label: '公休日', icon: CalendarIcon, badge: 0 }
      ]
    },
    {
      label: '行銷',
      items: [
        { to: '/admin/coupons', label: '優惠碼', icon: TicketIcon, badge: 0 },
        { to: '/admin/announcements', label: '跑馬燈公告', icon: MegaphoneIcon, badge: 0 }
      ]
    },
    {
      label: '分析與系統',
      items: [
        { to: '/admin/reports', label: '營運報表', icon: ChartBarIcon, badge: 0 },
        { to: '/admin/logs', label: '操作紀錄', icon: ClipboardDocumentListIcon, badge: 0 },
        { to: '/admin/users', label: '管理員', icon: UserGroupIcon, badge: 0 }
      ]
    }
  ]
})

const logout = async () => {
  await authStore.logout()
  router.push('/admin/login')
}

onMounted(refresh)
</script>
