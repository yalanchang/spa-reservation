<template>
  <div class="max-w-md mx-auto">
    <div class="card-cute p-8">
      <h2 class="text-2xl font-bold text-center text-cocoa">驗證信箱</h2>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <p v-if="emailFromLink" class="text-center text-sm text-gray-500">
          驗證碼已寄到 <span class="font-medium text-cocoa">{{ email }}</span>，請在 10 分鐘內輸入
        </p>
        <div v-else>
          <label for="verify-email" class="mb-1 block text-sm text-gray-600">註冊的電子郵件</label>
          <input
            id="verify-email"
            v-model="email"
            type="email"
            required
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

        <div>
          <label for="verify-code" class="mb-1 block text-sm text-gray-600">驗證碼</label>
          <VerificationCode
            id="verify-code"
            v-model="code"
            :email="email"
            purpose="register"
            :initial-wait="emailFromLink && !route.query.resend ? 60 : 0"
          />
        </div>

        <button type="submit" class="btn-cute w-full py-2.5 disabled:opacity-50 disabled:pointer-events-none" :disabled="loading">
          <LoadingSpinner v-if="loading" size="sm" />
          <template v-else>驗證並登入</template>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import VerificationCode from '@/components/common/VerificationCode.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const emailFromLink = typeof route.query.email === 'string' && !!route.query.email
const email = ref(emailFromLink ? (route.query.email as string) : '')
const code = ref('')
const loading = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  if (code.value.length !== 6) {
    error.value = '請輸入 6 位數驗證碼'
    return
  }
  loading.value = true
  try {
    const res = await apiClient.post('/auth/verify-email', { email: email.value, code: code.value }) as any
    authStore.setSession(res.data.token, res.data.user)
    toast.success('信箱驗證完成，歡迎加入')
    router.replace('/')
  } catch (e: any) {
    error.value = e?.message || '驗證失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>
