<template>
  <div>
    <input
      :id="id"
      v-model="model"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      placeholder="6 位數驗證碼"
      required
      class="w-full text-center text-xl tracking-[0.5em] placeholder:text-base placeholder:tracking-normal"
      :class="
        variant === 'admin'
          ? 'rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          : 'rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500'
      "
      @input="model = model.replace(/\D/g, '').slice(0, 6)"
    />
    <p class="mt-2 text-xs text-gray-400">收到多封信時，請用最新一封的驗證碼，舊的會失效</p>
    <p class="mt-1 text-sm text-gray-500">
      沒收到信？
      <button
        type="button"
        class="font-medium disabled:cursor-not-allowed disabled:text-gray-400"
        :class="variant === 'admin' ? 'text-blue-600' : 'text-primary-600'"
        :disabled="countdown > 0 || sending"
        @click="resend"
      >
        {{ countdown > 0 ? `${countdown} 秒後可重新寄送` : sending ? '寄送中' : '重新寄送' }}
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'

const props = withDefaults(
  defineProps<{
    email: string
    purpose: 'register' | 'reset' | 'change_email'
    variant?: 'site' | 'admin'
    id?: string
    // 剛寄出時要等幾秒才能重寄
    initialWait?: number
    // 自訂重寄方式（例如更換信箱要寄到新信箱），回傳下次可重寄的秒數
    resendFn?: () => Promise<number>
  }>(),
  { variant: 'site', initialWait: 60 }
)

const model = defineModel<string>({ default: '' })
const toast = useToast()
const countdown = ref(0)
const sending = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const startCountdown = (seconds: number) => {
  countdown.value = seconds
  clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

const resend = async () => {
  sending.value = true
  try {
    let wait = 60
    if (props.resendFn) {
      wait = await props.resendFn()
    } else {
      const res = (await apiClient.post('/auth/resend-code', { email: props.email, purpose: props.purpose })) as any
      wait = res.data?.waitSeconds || 60
    }
    toast.success('已重新寄送驗證碼')
    model.value = ''
    startCountdown(wait)
  } catch (error: any) {
    toast.error(error?.message || '寄送失敗，請稍後再試')
  } finally {
    sending.value = false
  }
}

onMounted(() => props.initialWait > 0 && startCountdown(props.initialWait))
onUnmounted(() => clearInterval(timer))
</script>
