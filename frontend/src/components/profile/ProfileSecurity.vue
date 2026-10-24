<template>
  <div class="space-y-8">
    <!-- 帳號與登入 -->
    <section>
      <h3 class="profile-section-title">帳號與登入</h3>
      <ul class="divide-y divide-primary-50 rounded-2xl border border-primary-100">
        <li class="flex items-center gap-4 px-4 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-500">電子郵件</p>
            <p class="truncate font-medium text-cocoa">{{ user?.email }}</p>
          </div>
          <button type="button" class="security-action" @click="openEmail">更換</button>
        </li>
        <li class="flex items-center gap-4 px-4 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-500">密碼</p>
            <p class="font-medium text-cocoa">{{ user?.has_password ? '••••••••' : '尚未設定' }}</p>
          </div>
          <button type="button" class="security-action" @click="openPassword">
            {{ user?.has_password ? '變更' : '設定' }}
          </button>
        </li>
        <li v-for="m in socialLogins" :key="m.label" class="flex items-center gap-4 px-4 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-500">{{ m.label }} 登入</p>
            <p class="font-medium" :class="m.linked ? 'text-emerald-600' : 'text-gray-400'">
              {{ m.linked ? '已連結' : '未連結' }}
            </p>
          </div>
        </li>
      </ul>
    </section>

    <!-- 刪除帳號 -->
    <section v-if="user?.role === 'customer'">
      <h3 class="profile-section-title">刪除帳號</h3>
      <div class="flex items-center gap-4 rounded-2xl border border-red-100 px-4 py-4">
        <p class="flex-1 text-sm text-gray-500">刪除後會員資料、收藏與心得都會清除，無法復原</p>
        <button type="button" class="security-action !border-red-200 !text-red-600" @click="openDelete">
          刪除帳號
        </button>
      </div>
    </section>

    <!-- 更換信箱 -->
    <BaseModal :open="emailOpen" title="更換信箱" @close="emailOpen = false">
      <ol class="mb-6 flex items-center gap-2 text-sm">
        <li v-for="(label, i) in ['輸入新信箱', '輸入驗證碼']" :key="label" class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
            :class="emailStepIndex >= i ? 'bg-primary-600 text-white' : 'bg-primary-50 text-gray-400'"
          >
            {{ i + 1 }}
          </span>
          <span :class="emailStepIndex >= i ? 'font-semibold text-cocoa' : 'text-gray-400'">{{ label }}</span>
          <span v-if="i === 0" class="mx-1 h-px w-6 bg-primary-100"></span>
        </li>
      </ol>

      <form v-if="emailStep === 'request'" class="space-y-4" @submit.prevent="requestEmail">
        <p class="text-sm text-gray-500">目前的信箱：{{ user?.email }}</p>
        <div>
          <label for="new-email" class="profile-label">新的信箱</label>
          <input id="new-email" v-model="emailForm.newEmail" type="email" required class="profile-input" />
        </div>
        <div v-if="user?.has_password">
          <label for="email-password" class="profile-label">目前的密碼</label>
          <PasswordInput id="email-password" v-model="emailForm.password" autocomplete="current-password" />
          <p class="mt-1 text-xs text-gray-400"></p>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" class="btn-cute-outline flex-1 py-2.5" @click="emailOpen = false">取消</button>
          <button
            type="submit"
            class="btn-cute flex-1 py-2.5 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="savingEmail"
          >
            <LoadingSpinner v-if="savingEmail" size="sm" />
            <template v-else>寄送驗證碼</template>
          </button>
        </div>
      </form>

      <form v-else class="space-y-4" @submit.prevent="confirmEmail">
        <p class="text-sm text-gray-500">
          驗證碼已寄到 <span class="font-medium text-cocoa">{{ emailForm.newEmail }}</span
          >，10 分鐘內有效
        </p>
        <VerificationCode
          id="email-code"
          v-model="emailForm.code"
          :email="emailForm.newEmail"
          purpose="change_email"
          :initial-wait="emailWait"
          :resend-fn="sendEmailCode"
        />
        <div class="flex gap-3 pt-2">
          <button type="button" class="btn-cute-outline flex-1 py-2.5" @click="emailStep = 'request'">上一步</button>
          <button
            type="submit"
            class="btn-cute flex-1 py-2.5 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="savingEmail"
          >
            <LoadingSpinner v-if="savingEmail" size="sm" />
            <template v-else>確認更換</template>
          </button>
        </div>
      </form>
    </BaseModal>

    <!-- 密碼 -->
    <BaseModal :open="passwordOpen" :title="user?.has_password ? '變更密碼' : '設定密碼'" @close="passwordOpen = false">
      <form class="space-y-4" @submit.prevent="changePassword">
        <p v-if="!user?.has_password" class="text-sm text-gray-500">
          你目前是用 Google 或 LINE 登入，設定密碼後也可以用信箱和密碼登入
        </p>
        <div v-if="user?.has_password">
          <label for="current-password" class="profile-label">目前的密碼</label>
          <PasswordInput id="current-password" v-model="passwordForm.current" autocomplete="current-password" />
        </div>
        <div>
          <label for="new-password" class="profile-label">新密碼（至少 6 個字元）</label>
          <PasswordInput id="new-password" v-model="passwordForm.next" autocomplete="new-password" />
        </div>
        <div>
          <label for="confirm-password" class="profile-label">再輸入一次新密碼</label>
          <PasswordInput id="confirm-password" v-model="passwordForm.confirm" autocomplete="new-password" />
          <p
            v-if="passwordForm.confirm && passwordForm.confirm !== passwordForm.next"
            class="mt-1 text-xs text-red-500"
          >
            兩次輸入的密碼不一樣
          </p>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" class="btn-cute-outline flex-1 py-2.5" @click="passwordOpen = false">取消</button>
          <button
            type="submit"
            class="btn-cute flex-1 py-2.5 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="savingPassword"
          >
            <LoadingSpinner v-if="savingPassword" size="sm" />
            <template v-else>儲存</template>
          </button>
        </div>
      </form>
    </BaseModal>

    <!-- 刪除帳號 -->
    <BaseModal :open="deleteOpen" title="刪除帳號" @close="deleteOpen = false">
      <form class="space-y-4" @submit.prevent="deleteAccount">
        <ul class="list-disc space-y-1 rounded-2xl bg-red-50 py-3 pl-8 pr-4 text-sm text-red-700">
          <li>會員資料、收藏與心得會全部刪除</li>
          <li>還沒到的預約會自動取消</li>
          <li>刪除後無法復原</li>
        </ul>
        <div v-if="user?.has_password">
          <label for="delete-password" class="profile-label">輸入密碼確認</label>
          <PasswordInput id="delete-password" v-model="deleteForm.password" autocomplete="current-password" />
        </div>
        <div v-else>
          <label for="delete-confirm" class="profile-label">請輸入「刪除帳號」四個字確認</label>
          <input id="delete-confirm" v-model="deleteForm.confirmText" class="profile-input" />
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" class="btn-cute-outline flex-1 py-2.5" @click="deleteOpen = false">取消</button>
          <button
            type="submit"
            class="inline-flex flex-1 items-center justify-center rounded-full bg-red-600 py-2.5 font-semibold text-white transition hover:font-bold active:scale-95 disabled:opacity-50"
            :disabled="deleting"
          >
            <LoadingSpinner v-if="deleting" size="sm" />
            <template v-else>永久刪除</template>
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useFavorites } from '@/composables/useFavorites'
import BaseModal from '@/components/common/BaseModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import VerificationCode from '@/components/common/VerificationCode.vue'

const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()
const { favorites } = useFavorites()
const user = computed(() => authStore.user)

const socialLogins = computed(() => [
  { label: 'Google', linked: !!user.value?.google_linked },
  { label: 'LINE', linked: !!user.value?.line_linked }
])

// ---- 更換信箱
const emailOpen = ref(false)
const emailStep = ref<'request' | 'code'>('request')
const emailStepIndex = computed(() => (emailStep.value === 'request' ? 0 : 1))
const emailForm = ref({ newEmail: '', password: '', code: '' })
const emailWait = ref(60)
const savingEmail = ref(false)

const openEmail = () => {
  emailForm.value = { newEmail: '', password: '', code: '' }
  emailStep.value = 'request'
  emailOpen.value = true
}

const sendEmailCode = async () => {
  const res = (await apiClient.post('/auth/email/request', {
    newEmail: emailForm.value.newEmail,
    password: emailForm.value.password
  })) as any
  return res.data?.waitSeconds ?? 60
}

const requestEmail = async () => {
  savingEmail.value = true
  try {
    emailWait.value = await sendEmailCode()
    emailForm.value.code = ''
    emailStep.value = 'code'
  } catch (error: any) {
    toast.error(error?.message || '寄送失敗，請稍後再試')
  } finally {
    savingEmail.value = false
  }
}

const confirmEmail = async () => {
  if (emailForm.value.code.length !== 6) return toast.warning('請輸入 6 位數驗證碼')
  savingEmail.value = true
  try {
    const res = (await apiClient.post('/auth/email/confirm', { code: emailForm.value.code })) as any
    authStore.setSession(res.data.token, res.data.user)
    toast.success('信箱已更換')
    emailOpen.value = false
  } catch (error: any) {
    toast.error(error?.message || '驗證失敗，請稍後再試')
  } finally {
    savingEmail.value = false
  }
}

// ---- 密碼
const passwordOpen = ref(false)
const passwordForm = ref({ current: '', next: '', confirm: '' })
const savingPassword = ref(false)

const openPassword = () => {
  passwordForm.value = { current: '', next: '', confirm: '' }
  passwordOpen.value = true
}

const changePassword = async () => {
  if (passwordForm.value.next.length < 6) return toast.warning('新密碼至少要 6 個字元')
  if (passwordForm.value.next !== passwordForm.value.confirm) return toast.warning('兩次輸入的密碼不一樣')

  savingPassword.value = true
  try {
    const res = (await apiClient.put('/auth/password', {
      currentPassword: passwordForm.value.current,
      newPassword: passwordForm.value.next
    })) as any
    toast.success(res.message)
    passwordOpen.value = false
    await authStore.fetchProfile()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗，請稍後再試')
  } finally {
    savingPassword.value = false
  }
}

// ---- 刪除帳號
const deleteOpen = ref(false)
const deleteForm = ref({ password: '', confirmText: '' })
const deleting = ref(false)

const openDelete = () => {
  deleteForm.value = { password: '', confirmText: '' }
  deleteOpen.value = true
}

const deleteAccount = async () => {
  deleting.value = true
  try {
    await apiClient.delete('/auth/account', { data: deleteForm.value })
    favorites.value = []
    try {
      localStorage.removeItem('favoriteServices')
    } catch {
      // 存取不到就算了
    }
    deleteOpen.value = false
    await authStore.logout()
    toast.success('帳號已刪除，謝謝你曾經的陪伴')
    router.replace('/')
  } catch (error: any) {
    toast.error(error?.message || '刪除失敗，請稍後再試')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.security-action {
  @apply shrink-0 rounded-full border-2 border-primary-200 px-4 py-1.5 text-sm font-medium text-primary-600 transition hover:font-bold active:scale-95;
}
</style>
