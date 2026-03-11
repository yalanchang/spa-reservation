<template>
    <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-8">
            <h2 class="text-2xl font-bold text-center mb-6">建立帳號</h2>

            <form @submit.prevent="handleRegister" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <input v-model="form.name" type="text" required
                        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="請輸入姓名" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
                    <input v-model="form.email" type="email" required
                        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="請輸入電子郵件" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">手機號碼（選填）</label>
                    <input v-model="form.phone" type="tel"
                        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="09xxxxxxxx" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                    <div class="relative">
                        <input v-model="form.password" :type="showPassword ? 'text' : 'password'" required
                            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                            placeholder="至少 8 個字元" />
                        <button type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            @click="showPassword = !showPassword">
                            <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                            </svg>
                            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg> </button>
                    </div>
                    <!-- 密碼強度 -->
                    <div class="mt-2">
                        <div class="flex gap-1">
                            <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded"
                                :class="passwordStrength >= i ? strengthColor : 'bg-gray-200'"></div>
                        </div>
                        <p class="text-xs mt-1" :class="strengthTextColor">{{ strengthText }}</p>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
                    <div class="relative">
                        <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" required
                            class="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="請再次輸入密碼" />
                        <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                            class="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                            <!-- 眼睛開 -->
                            <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <!-- 眼睛關 -->
                            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.163-3.592M6.47 6.47A9.97 9.97 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.357 2.524M6.47 6.47L3 3m3.47 3.47l11.06 11.06M3 3l18 18" />
                            </svg>
                        </button>
                    </div>
                    <p v-if="form.confirmPassword && form.password !== form.confirmPassword"
                        class="text-red-500 text-xs mt-1">
                        密碼不一致
                    </p>
                </div>

                <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
                <div v-if="successMsg" class="text-green-600 text-sm">{{ successMsg }}</div>

                <button type="submit" :disabled="loading || form.password !== form.confirmPassword"
                    class="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
                    {{ loading ? '註冊中...' : '建立帳號' }}
                </button>
            </form>

            <p class="text-center text-sm text-gray-600 mt-6">
                已有帳號？
                <router-link to="/login" class="text-primary-600 hover:underline font-medium">立即登入</router-link>
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/api/client'

const router = useRouter()

const form = ref({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
})

const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordStrength = computed(() => {
    const p = form.value.password
    if (!p) return 0
    let strength = 0
    if (p.length >= 8) strength++
    if (/[A-Z]/.test(p)) strength++
    if (/[0-9]/.test(p)) strength++
    if (/[^A-Za-z0-9]/.test(p)) strength++
    return strength
})

const strengthColor = computed(() => {
    if (passwordStrength.value <= 1) return 'bg-red-400'
    if (passwordStrength.value === 2) return 'bg-yellow-400'
    if (passwordStrength.value === 3) return 'bg-blue-400'
    return 'bg-green-400'
})

const strengthTextColor = computed(() => {
    if (passwordStrength.value <= 1) return 'text-red-500'
    if (passwordStrength.value === 2) return 'text-yellow-500'
    if (passwordStrength.value === 3) return 'text-blue-500'
    return 'text-green-500'
})

const strengthText = computed(() => {
    if (!form.value.password) return ''
    if (passwordStrength.value <= 1) return '密碼強度：弱'
    if (passwordStrength.value === 2) return '密碼強度：普通'
    if (passwordStrength.value === 3) return '密碼強度：良好'
    return '密碼強度：強'
})

const handleRegister = async () => {
    if (form.value.password !== form.value.confirmPassword) return
    loading.value = true
    error.value = ''
    try {
        await apiClient.post('/auth/register', {
            name: form.value.name,
            email: form.value.email,
            phone: form.value.phone,
            password: form.value.password
        }) as any

        successMsg.value = '註冊成功！即將跳轉到登入頁...'
        setTimeout(() => router.push('/login'), 1500)
    } catch (e: any) {
        error.value = e?.message || '註冊失敗，請稍後再試'
    } finally {
        loading.value = false
    }
}
</script>