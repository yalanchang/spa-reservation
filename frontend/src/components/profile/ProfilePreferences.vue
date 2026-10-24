<template>
  <form class="space-y-6" @submit.prevent="save">
    <p class="rounded-2xl bg-primary-50 px-4 py-3 text-sm text-gray-600">
      這些資料會在預約時自動帶入，美容師也會事先看到，讓每次療程更貼近你的需要
    </p>

    <div>
      <label for="pref-staff" class="profile-label">指定美容師</label>
      <select id="pref-staff" v-model="form.preferredStaffId" class="profile-input">
        <option :value="null">不指定</option>
        <option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div>
      <label for="pref-skin" class="profile-label">膚質</label>
      <select id="pref-skin" v-model="form.skinType" class="profile-input">
        <option value="">不指定</option>
        <option v-for="t in SKIN_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <div>
      <label for="pref-notes" class="profile-label">過敏或注意事項</label>
      <textarea
        id="pref-notes"
        v-model="form.careNotes"
        rows="4"
        maxlength="500"
        placeholder="例如：對薰衣草精油過敏、腰部舊傷請避開、懷孕中"
        class="profile-input"
      ></textarea>
      <p class="mt-1 text-right text-xs text-gray-400">{{ form.careNotes.length }} / 500</p>
    </div>

    <div class="flex justify-end">
      <button type="submit" class="btn-cute px-8 py-2.5 disabled:opacity-50 disabled:pointer-events-none" :disabled="saving">
        <LoadingSpinner v-if="saving" size="sm" />
        <template v-else>儲存偏好</template>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const SKIN_TYPES = [
  { value: 'dry', label: '乾性肌' },
  { value: 'oily', label: '油性肌' },
  { value: 'combination', label: '混合肌' },
  { value: 'normal', label: '中性肌' },
  { value: 'sensitive', label: '敏感肌' }
]

const toast = useToast()
const authStore = useAuthStore()

const staffList = ref<any[]>([])
const form = ref({
  preferredStaffId: authStore.user?.preferred_staff_id ?? null,
  skinType: authStore.user?.skin_type || '',
  careNotes: authStore.user?.care_notes || ''
})
const saving = ref(false)

onMounted(async () => {
  try {
    const res = await apiClient.get('/staff') as any
    staffList.value = res.data || []
  } catch (error) {
    console.error('Failed to load staff:', error)
  }
})

const save = async () => {
  saving.value = true
  try {
    const res = await apiClient.put('/auth/profile/preferences', form.value) as any
    authStore.setSession(authStore.token!, res.data)
    toast.success('偏好已更新')
  } catch (error: any) {
    toast.error(error?.message || '更新失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>
