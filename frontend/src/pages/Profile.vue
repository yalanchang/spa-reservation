<template>
  <div class="max-w-5xl mx-auto md:grid md:grid-cols-[15rem_1fr] md:items-start md:gap-6">
    <!-- 左側：會員資訊＋選單（手機上選單變成下拉） -->
    <aside class="card-cute mb-6 md:mb-0">
      <div class="flex items-center gap-4 border-b border-primary-50 p-5 md:flex-col md:text-center">
        <div class="relative shrink-0">
          <div
            class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-100 ring-4 ring-primary-50 md:h-20 md:w-20"
          >
            <img
              v-if="avatarPreview || user?.avatar"
              :src="avatarPreview || user?.avatar || ''"
              class="h-full w-full object-cover"
              alt="大頭貼"
            />
            <span v-else class="text-3xl text-primary-600">{{ user?.name?.charAt(0) || 'U' }}</span>
          </div>
          <div
            v-if="avatarUploading"
            class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white"
          >
            <LoadingSpinner size="sm" />
          </div>
          <label
            v-else
            class="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-xs text-white opacity-0 transition hover:opacity-100"
          >
            更換
            <input type="file" class="hidden" accept="image/jpeg,image/png,image/webp" @change="handleAvatarChange" />
          </label>
        </div>
        <div class="min-w-0 flex-1 md:w-full">
          <p class="truncate font-bold text-cocoa">{{ user?.name }}</p>
          <p class="truncate text-xs text-gray-500">{{ user?.email }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 md:justify-center">
            <span class="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-600">{{
              roleLabel
            }}</span>
            <button
              v-if="user?.avatar && !avatarUploading"
              type="button"
              class="text-xs text-gray-400 hover:font-bold"
              @click="removeAvatar"
            >
              移除大頭貼
            </button>
          </div>
        </div>
      </div>

      <!-- 手機：下拉選單 -->
      <div class="p-4 md:hidden">
        <label for="profile-tab-select" class="sr-only">切換頁面</label>
        <select
          id="profile-tab-select"
          :value="tab"
          class="profile-input"
          @change="selectTab(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <nav class="hidden p-2 md:block" aria-label="個人資料選單">
        <ul class="flex flex-col gap-1">
          <li v-for="t in tabs" :key="t.value">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition"
              :class="tab === t.value ? 'bg-primary-50 font-bold text-primary-600' : 'text-cocoa hover:font-bold'"
              :aria-current="tab === t.value ? 'page' : undefined"
              @click="selectTab(t.value)"
            >
              <component :is="t.icon" class="h-5 w-5 shrink-0" />
              {{ t.label }}
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- 右側：內容 -->
    <div class="min-w-0">
      <div v-if="avatarError" class="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
        <ExclamationCircleIcon class="h-5 w-5 flex-shrink-0 text-red-500" />
        <div class="min-w-0 flex-1">
          <p class="font-medium text-red-800">大頭貼更新失敗：{{ avatarError.message }}</p>
          <p v-if="avatarError.hint" class="mt-1 text-red-700">建議：{{ avatarError.hint }}</p>
        </div>
        <button class="flex-shrink-0 text-red-400 hover:text-red-600" aria-label="關閉" @click="avatarError = null">
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>

      <div class="card-cute p-6 sm:p-8">
        <h1 class="mb-6 text-xl font-bold text-cocoa">{{ currentTab.label }}</h1>
        <ProfileOverview v-if="tab === 'overview'" />
        <ProfileBasicInfo v-else-if="tab === 'basic'" />
        <ProfilePreferences v-else-if="tab === 'preferences'" />
        <ProfileCoupons v-else-if="tab === 'coupons'" />
        <ProfileSecurity v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ExclamationCircleIcon,
  XMarkIcon,
  SparklesIcon,
  UserIcon,
  HeartIcon,
  ShieldCheckIcon,
  TicketIcon
} from '@heroicons/vue/24/outline'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useConfirm } from '@/composables/useConfirm'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ProfileOverview from '@/components/profile/ProfileOverview.vue'
import ProfileBasicInfo from '@/components/profile/ProfileBasicInfo.vue'
import ProfilePreferences from '@/components/profile/ProfilePreferences.vue'
import ProfileSecurity from '@/components/profile/ProfileSecurity.vue'
import ProfileCoupons from '@/components/profile/ProfileCoupons.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const user = computed(() => authStore.user)

const tabs = [
  { value: 'overview', label: '會員概況', icon: SparklesIcon },
  { value: 'basic', label: '基本資料', icon: UserIcon },
  { value: 'preferences', label: '美容偏好', icon: HeartIcon },
  { value: 'coupons', label: '我的優惠券', icon: TicketIcon },
  { value: 'security', label: '帳號安全', icon: ShieldCheckIcon }
]

// 分頁記在網址，重新整理或分享連結都會停在同一頁
const tab = ref(tabs.some((t) => t.value === route.query.tab) ? (route.query.tab as string) : 'overview')
const currentTab = computed(() => tabs.find((t) => t.value === tab.value) || tabs[0])
// 從頁面內的連結改變網址（例如基本資料的「更換」信箱）時，分頁也要跟著切換
watch(
  () => route.query.tab,
  (value) => {
    tab.value = tabs.some((t) => t.value === value) ? (value as string) : 'overview'
  }
)
const selectTab = (value: string) => {
  tab.value = value
  router.replace({ query: value === 'overview' ? {} : { tab: value } })
}

const roleLabel = computed(
  () => (({ admin: '管理員', staff: '美容師' }) as Record<string, string>)[user.value?.role || ''] || '一般會員'
)

// ---- 大頭貼
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_MB = 10
const avatarPreview = ref<string | null>(null)
const avatarUploading = ref(false)
const avatarError = ref<{ message: string; hint?: string } | null>(null)

const handleAvatarChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 清空 input，才能再次選擇同一張圖片
  input.value = ''
  if (!file) return

  avatarError.value = null
  if (!AVATAR_TYPES.includes(file.type)) {
    avatarError.value = {
      message: `不支援這種圖片格式（${file.name.split('.').pop()?.toUpperCase() || '未知'}）`,
      hint: '請使用 JPG、PNG 或 WebP；iPhone 的 HEIC 照片可以先截圖或轉成 JPG'
    }
    return
  }
  if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
    avatarError.value = {
      message: `圖片太大（${(file.size / 1024 / 1024).toFixed(1)}MB），上限 ${AVATAR_MAX_MB}MB`,
      hint: '請壓縮圖片，或改用較小的照片後再試'
    }
    return
  }

  avatarPreview.value = URL.createObjectURL(file)
  avatarUploading.value = true

  const formData = new FormData()
  formData.append('avatar', file)
  try {
    await apiClient.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    })
    await authStore.fetchProfile()
    toast.success('大頭貼已更新')
  } catch (e: any) {
    avatarError.value = {
      message: e?.message || '上傳失敗',
      hint: e?.hint || '請稍後再試'
    }
  } finally {
    avatarPreview.value = null
    avatarUploading.value = false
  }
}

const removeAvatar = async () => {
  const ok = await confirm({ title: '確定要移除大頭貼嗎？', confirmText: '移除' })
  if (!ok) return
  try {
    const res = (await apiClient.delete('/auth/avatar')) as any
    authStore.setSession(authStore.token!, res.data)
    toast.success('大頭貼已移除')
  } catch (error: any) {
    toast.error(error?.message || '移除失敗，請稍後再試')
  }
}

onMounted(() => authStore.fetchProfile())
</script>
