<template>
  <!-- 後台幫忙建立的帳號：首次登入提醒改掉初始密碼 -->
  <AdminModal :open="open" title="請更改初始密碼" @close="later">
    <form class="space-y-4" @submit.prevent="submit">
      <p class="rounded-md bg-amber-50 px-3 py-2.5 text-amber-800">
        這個帳號是由管理員建立的，為了帳號安全，請把初始密碼換成只有你知道的密碼。
      </p>
      <div>
        <label class="admin-label" for="cp-current">目前密碼（初始密碼）</label>
        <PasswordInput id="cp-current" v-model="form.current" variant="admin" autocomplete="current-password" />
      </div>
      <div>
        <label class="admin-label" for="cp-new">新密碼</label>
        <PasswordInput id="cp-new" v-model="form.next" variant="admin" autocomplete="new-password" />
        <p class="admin-hint">至少 6 個字元</p>
      </div>
      <div>
        <label class="admin-label" for="cp-confirm">再次輸入新密碼</label>
        <PasswordInput id="cp-confirm" v-model="form.confirm" variant="admin" autocomplete="new-password" />
      </div>
      <div class="admin-modal-actions">
        <button type="button" class="admin-btn-outline" @click="later">稍後再說</button>
        <button type="submit" class="admin-btn" :disabled="saving">
          <LoadingSpinner v-if="saving" size="sm" />
          <template v-else>更新密碼</template>
        </button>
      </div>
    </form>
  </AdminModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { isDemoSession } from '@/utils/token'
import AdminModal from '@/components/admin/AdminModal.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const toast = useToast()
const authStore = useAuthStore()

// 按「稍後再說」只關掉這次，下次登入還會再提醒
const dismissed = ref(false)
const open = computed(
  () => !dismissed.value && !!Number(authStore.user?.must_change_password) && !isDemoSession(authStore.token)
)

const form = ref({ current: '', next: '', confirm: '' })
const saving = ref(false)

const later = () => {
  dismissed.value = true
}

const submit = async () => {
  if (form.value.next.length < 6) return void toast.warning('新密碼至少要 6 個字元')
  if (form.value.next !== form.value.confirm) return void toast.warning('兩次輸入的新密碼不一樣')
  saving.value = true
  try {
    await apiClient.put('/auth/password', { currentPassword: form.value.current, newPassword: form.value.next })
    if (authStore.user) {
      authStore.user.must_change_password = false
      localStorage.setItem('user', JSON.stringify(authStore.user))
    }
    toast.success('密碼已更新')
  } catch (error: any) {
    toast.error(error?.message || '密碼更新失敗')
  } finally {
    saving.value = false
  }
}
</script>
