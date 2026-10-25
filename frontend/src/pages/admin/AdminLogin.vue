<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-800">
    <div class="w-full max-w-sm">
      <div class="mb-6 text-center">
        <p class="text-lg font-semibold text-gray-900">美容預約系統</p>
        <p class="mt-1 text-sm text-gray-500">店家後台登入</p>
      </div>

      <form
        class="space-y-4 rounded-md border border-gray-200 bg-white p-6"
        autocomplete="off"
        @submit.prevent="handleLogin"
      >
        <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

        <div>
          <label for="admin-email" class="mb-1 block text-sm text-gray-600">電子郵件</label>
          <input
            id="admin-email"
            v-model="form.email"
            type="email"
            required
            autocomplete="off"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between">
            <label for="admin-password" class="block text-sm text-gray-600">密碼</label>
            <router-link to="/admin/forgot-password" class="text-sm text-blue-600 hover:underline"
              >忘記密碼？</router-link
            >
          </div>
          <PasswordInput id="admin-password" v-model="form.password" variant="admin" autocomplete="off" />
        </div>

        <button
          type="submit"
          class="flex w-full justify-center rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          :disabled="loading"
        >
          <LoadingSpinner v-if="loading" size="sm" />
          <template v-else>登入</template>
        </button>
      </form>

      <!-- 展示帳號：給面試官／訪客不用帳密直接看後台 -->
      <div
        v-if="demoEnabled"
        class="mt-4 rounded-md border border-dashed border-blue-200 bg-blue-50/60 p-4 text-center"
      >
        <p class="text-sm text-gray-600">想先看看後台？</p>
        <button
          type="button"
          class="mt-2 flex w-full justify-center rounded-md border border-blue-600 bg-white py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          :disabled="demoLoading"
          @click="handleDemoLogin"
        >
          <LoadingSpinner v-if="demoLoading" size="sm" />
          <template v-else>一鍵登入展示帳號</template>
        </button>
        <p class="mt-2 text-xs text-gray-400">可自由操作各項功能，管理員權限與帳號資料無法變更</p>
      </div>

      <p class="mt-4 text-center text-sm">
        <router-link to="/" class="text-gray-500 hover:text-gray-900">回到前台</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const form = ref({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const demoEnabled = ref(false)
const demoLoading = ref(false)

onMounted(async () => {
  if (route.query.denied) error.value = '目前登入的帳號沒有後台權限，請改用店家帳號登入'
  try {
    const res = (await apiClient.get('/auth/admin/demo')) as any
    demoEnabled.value = !!res.data?.enabled
  } catch {
    // 查不到就不顯示展示帳號按鈕
  }
})

const enterAdmin = (res: any, message: string) => {
  authStore.setSession(res.data.token, res.data.user)
  toast.success(message)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  router.push(redirect.startsWith('/admin') ? redirect : '/admin/appointments')
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = (await apiClient.post('/auth/admin/login', form.value)) as any
    enterAdmin(res, `歡迎回來，${res.data.user.name}`)
  } catch (e: any) {
    error.value = e?.message || '登入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

const handleDemoLogin = async () => {
  demoLoading.value = true
  error.value = ''
  try {
    const res = (await apiClient.post('/auth/admin/demo')) as any
    enterAdmin(res, '已用展示帳號登入')
  } catch (e: any) {
    error.value = e?.message || '展示帳號登入失敗，請稍後再試'
  } finally {
    demoLoading.value = false
  }
}
</script>
