<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 lg:flex">
    <!-- 手機：抽屜選單的半透明背景，點一下關閉 -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div v-if="menuOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="menuOpen = false"></div>
    </Transition>

    <!-- 選單：桌機固定在左側；手機收在右側，按漢堡鈕從右邊滑進來 -->
    <aside
      id="admin-menu"
      class="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-out lg:left-0 lg:right-auto lg:w-56 lg:translate-x-0 lg:border-l-0 lg:border-r lg:shadow-none"
      :class="menuOpen ? 'translate-x-0' : 'translate-x-full'"
      :aria-hidden="!menuOpen && !isDesktop"
    >
      <div class="flex h-14 shrink-0 items-center border-b border-gray-200 px-5">
        <span class="font-semibold text-gray-900">美容預約系統</span>
        <span class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">後台</span>
        <button
          type="button"
          class="-mr-2 ml-auto flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          aria-label="關閉選單"
          @click="menuOpen = false"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        <div v-for="group in menuGroups" :key="group.label">
          <p class="px-3 pb-1 text-xs text-gray-400">{{ group.label }}</p>
          <div class="space-y-0.5">
            <router-link
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 lg:py-2"
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
          <!-- 手機：漢堡鈕，有待辦時加紅點 -->
          <button
            type="button"
            class="relative -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="開啟選單"
            aria-controls="admin-menu"
            :aria-expanded="menuOpen"
            @click="menuOpen = true"
          >
            <Bars3Icon class="h-6 w-6" />
            <span v-if="hasBadge" class="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
          </button>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-6">
        <p v-if="isDemo" class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          你正在使用<strong class="font-medium">展示帳號</strong>，可以自由操作各項功能；管理員權限與帳號資料無法變更。
        </p>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { isDemoSession } from '@/utils/token'
import { useAdminStats } from '@/composables/useAdminStats'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { stats, refresh } = useAdminStats()

const roleLabel = computed(() => (authStore.user?.role === 'admin' ? '管理員' : '美容師'))
const isDemo = computed(() => isDemoSession(authStore.token))

const isAdmin = computed(() => authStore.user?.role === 'admin')

// ---- 手機抽屜選單：換頁、按 Esc、切到桌機寬度都會自動關閉
const menuOpen = ref(false)
const desktopQuery = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(desktopQuery.matches)
const onDesktopChange = (e: MediaQueryListEvent) => {
  isDesktop.value = e.matches
  if (e.matches) menuOpen.value = false
}
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') menuOpen.value = false
}
watch(
  () => route.path,
  () => (menuOpen.value = false)
)
// 選單開著時鎖住背後頁面
watch(menuOpen, (open) => (document.body.style.overflow = open ? 'hidden' : ''))
onMounted(() => {
  desktopQuery.addEventListener('change', onDesktopChange)
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  desktopQuery.removeEventListener('change', onDesktopChange)
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

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

const hasBadge = computed(() => menuGroups.value.some((g) => g.items.some((item) => item.badge)))

const logout = async () => {
  await authStore.logout()
  router.push('/admin/login')
}

onMounted(refresh)
</script>
