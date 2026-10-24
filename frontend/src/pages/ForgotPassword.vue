<template>
  <div :class="isAdmin ? 'flex min-h-screen items-center justify-center bg-gray-100 px-4 text-gray-800' : 'max-w-md mx-auto'">
    <div class="w-full" :class="{ 'max-w-sm': isAdmin }">
      <div v-if="isAdmin" class="mb-6 text-center">
        <p class="text-lg font-semibold text-gray-900">美容預約系統</p>
        <p class="mt-1 text-sm text-gray-500">店家後台</p>
      </div>

      <div :class="isAdmin ? 'rounded-md border border-gray-200 bg-white p-6' : 'card-cute p-8'">
        <h2 :class="isAdmin ? 'text-base font-semibold text-gray-900' : 'text-2xl font-bold text-center text-cocoa'">忘記密碼</h2>

        <!-- 第一步：輸入信箱 -->
        <form v-if="step === 'email'" class="mt-4 space-y-4" @submit.prevent="sendCode">
          <p class="text-sm text-gray-500" :class="{ 'text-center': !isAdmin }">輸入註冊時的電子郵件，我們會寄出 6 位數驗證碼</p>
          <p v-if="emailError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ emailError }}
            <router-link v-if="emailNotFound && !isAdmin" to="/register" class="ml-1 font-medium underline">立即註冊</router-link>
          </p>
          <div>
            <label for="forgot-email" class="mb-1 block text-sm text-gray-600">電子郵件</label>
            <input id="forgot-email" v-model="email" type="email" required :autocomplete="isAdmin ? 'off' : 'email'" :class="inputClass" />
          </div>
          <button type="submit" :disabled="loading" :class="buttonClass">
            <LoadingSpinner v-if="loading" size="sm" />
            <template v-else>寄出驗證碼</template>
          </button>
          <p class="text-center text-sm">
            <router-link :to="loginPath" class="text-gray-500 hover:text-gray-900">回到登入</router-link>
          </p>
        </form>

        <!-- 第二步：核對驗證碼 -->
        <form v-else-if="step === 'code'" class="mt-4 space-y-4" @submit.prevent="verifyCode">
          <p class="text-sm text-gray-500">
            驗證碼已寄到 <span class="font-medium text-gray-700">{{ email }}</span>，10 分鐘內有效。沒收到請查看垃圾郵件。
          </p>
          <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{{ error }}</p>

          <div>
            <label for="reset-code" class="mb-1 block text-sm text-gray-600">驗證碼</label>
            <VerificationCode id="reset-code" v-model="code" :email="email" purpose="reset" :variant="variant" :initial-wait="waitSeconds" />
          </div>

          <button type="submit" :disabled="loading" :class="buttonClass">
            <LoadingSpinner v-if="loading" size="sm" />
            <template v-else>下一步</template>
          </button>
          <p class="text-center text-sm">
            <button type="button" class="text-gray-500 hover:text-gray-900" @click="step = 'email'">換一個信箱</button>
          </p>
        </form>

        <!-- 第三步：設定新密碼 -->
        <form v-else class="mt-4 space-y-4" @submit.prevent="resetPassword">
          <p class="text-sm text-gray-500">驗證成功，請在 10 分鐘內設定新密碼</p>
          <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ error }}
            <button v-if="expired" type="button" class="ml-1 font-medium underline" @click="restart">重新取得驗證碼</button>
          </p>

          <div>
            <label for="new-password" class="mb-1 block text-sm text-gray-600">新密碼（至少 6 個字元）</label>
            <PasswordInput id="new-password" v-model="password" :variant="variant" autocomplete="new-password" />
          </div>
          <div>
            <label for="confirm-password" class="mb-1 block text-sm text-gray-600">再輸入一次</label>
            <PasswordInput id="confirm-password" v-model="confirmPassword" :variant="variant" autocomplete="new-password" />
            <p v-if="confirmPassword && confirmPassword !== password" class="mt-1 text-xs text-red-500">兩次輸入的密碼不一樣</p>
          </div>

          <button type="submit" :disabled="loading" :class="buttonClass">
            <LoadingSpinner v-if="loading" size="sm" />
            <template v-else>重設密碼</template>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import VerificationCode from '@/components/common/VerificationCode.vue'

const props = withDefaults(defineProps<{ variant?: 'site' | 'admin' }>(), { variant: 'site' })

const router = useRouter()
const toast = useToast()
const isAdmin = computed(() => props.variant === 'admin')
const loginPath = computed(() => (isAdmin.value ? '/admin/login' : '/login'))

const inputClass = computed(() =>
  isAdmin.value
    ? 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
    : 'w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent'
)
const buttonClass = computed(() =>
  isAdmin.value
    ? 'flex w-full justify-center rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
    : 'btn-cute w-full py-2.5 disabled:opacity-50 disabled:pointer-events-none'
)

const step = ref<'email' | 'code' | 'password'>('email')
const email = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const emailError = ref('')
const emailNotFound = ref(false)
const waitSeconds = ref(60)
const resetToken = ref('')
const expired = ref(false)

const sendCode = async () => {
  loading.value = true
  emailError.value = ''
  emailNotFound.value = false
  try {
    const res = await apiClient.post('/auth/forgot-password', {
      email: email.value,
      scope: isAdmin.value ? 'admin' : 'site'
    }) as any
    waitSeconds.value = res.data?.waitSeconds ?? 60
    code.value = ''
    error.value = ''
    step.value = 'code'
  } catch (e: any) {
    // 沒註冊或不是後台帳號：直接告訴使用者
    if (e?.code === 'EMAIL_NOT_FOUND' || e?.code === 'NOT_STAFF') {
      emailError.value = e.message
      emailNotFound.value = e.code === 'EMAIL_NOT_FOUND'
    } else {
      toast.error(e?.message || '送出失敗，請稍後再試')
    }
  } finally {
    loading.value = false
  }
}

// 第二步：先核對驗證碼，正確才能設定新密碼
const verifyCode = async () => {
  error.value = ''
  if (code.value.length !== 6) {
    error.value = '請輸入 6 位數驗證碼'
    return
  }
  loading.value = true
  try {
    const res = await apiClient.post('/auth/verify-reset-code', { email: email.value, code: code.value }) as any
    resetToken.value = res.data.resetToken
    password.value = ''
    confirmPassword.value = ''
    step.value = 'password'
  } catch (e: any) {
    error.value = e?.message || '驗證失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

// 第三步：帶著核對後取得的重設憑證設定新密碼
const resetPassword = async () => {
  error.value = ''
  expired.value = false
  if (password.value.length < 6) {
    error.value = '新密碼至少要 6 個字元'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = '兩次輸入的密碼不一樣'
    return
  }

  loading.value = true
  try {
    const res = await apiClient.post('/auth/reset-password', {
      email: email.value,
      resetToken: resetToken.value,
      password: password.value
    }) as any
    toast.success(res.message || '密碼已重設')
    router.replace(loginPath.value)
  } catch (e: any) {
    error.value = e?.message || '重設失敗，請稍後再試'
    expired.value = e?.code === 'RESET_EXPIRED'
  } finally {
    loading.value = false
  }
}

const restart = () => {
  step.value = 'email'
  error.value = ''
  expired.value = false
}
</script>
