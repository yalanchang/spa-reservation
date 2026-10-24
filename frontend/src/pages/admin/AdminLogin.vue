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

onMounted(() => {
  if (route.query.denied) error.value = '目前登入的帳號沒有後台權限，請改用店家帳號登入'
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = (await apiClient.post('/auth/admin/login', form.value)) as any
    authStore.setSession(res.data.token, res.data.user)
    toast.success(`歡迎回來，${res.data.user.name}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    router.push(redirect.startsWith('/admin') ? redirect : '/admin/appointments')
  } catch (e: any) {
    error.value = e?.message || '登入失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>
