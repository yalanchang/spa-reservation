<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
    <h1 class="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">個人資料</h1>

    <div class="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div class="relative group self-center sm:self-auto flex-shrink-0">
          <div class="w-20 h-20 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
            <img
              v-if="avatarPreview || user?.avatar"
              :src="avatarPreview || user?.avatar"
              class="w-full h-full object-cover"
              alt="頭像"
            />
            <span v-else class="text-3xl text-primary-600">
              {{ user?.name?.charAt(0) || 'U' }}
            </span>
          </div>

          <div
            v-if="avatarUploaded"
            class="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center"
          >
            <span class="text-white text-xs text-center">已更新</span>
          </div>

          <label
            v-else
            :style="{ opacity: isHovering ? '1' : '0' }"
            class="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center transition cursor-pointer"
            @mouseenter="isHovering = true"
            @mouseleave="isHovering = false"
          >
            <span class="text-white text-xs text-center">更換頭像</span>
            <input type="file" class="hidden" accept="image/*" @change="handleAvatarChange" />
          </label>
        </div>

        <!-- 姓名 / Email / 角色 -->
        <div class="text-center sm:text-left flex-1 min-w-0">
          <h2 class="text-xl sm:text-2xl font-semibold truncate">{{ user?.name }}</h2>
          <p class="text-gray-600 text-sm sm:text-base truncate">{{ user?.email }}</p>
          <span class="inline-block px-2 py-1 bg-primary-100 text-primary-600 text-sm rounded mt-2">
            {{ userRole }}
          </span>
        </div>

        <!-- 編輯按鈕 -->
        <div class="flex justify-center sm:justify-end sm:ml-auto flex-shrink-0">
          <button
            v-if="!editMode"
            class="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm sm:text-base"
            @click="startEdit"
          >
            編輯資料
          </button>
        </div>
      </div>

      <!-- 基本資料 -->
      <div class="border-t pt-6">
        <h3 class="text-lg font-semibold mb-4">基本資料</h3>

        <!-- 檢視模式 -->
        <div v-if="!editMode" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600">姓名</label>
            <p class="font-medium">{{ user?.name }}</p>
          </div>
          <div>
            <label class="block text-sm text-gray-600">電子郵件</label>
            <p class="font-medium break-all">{{ user?.email }}</p>
          </div>
          <div>
            <label class="block text-sm text-gray-600">電話</label>
            <p class="font-medium">{{ user?.phone || '未填寫' }}</p>
          </div>
          <div>
            <label class="block text-sm text-gray-600">會員等級</label>
            <p class="font-medium">{{ userRole }}</p>
          </div>
        </div>

        <!-- 編輯模式 -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-600 mb-1">姓名</label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">電子郵件</label>
            <input
              :value="user?.email"
              type="email"
              disabled
              class="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-400 cursor-not-allowed text-sm sm:text-base"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">電話</label>
            <input
              v-model="editForm.phone"
              type="tel"
              placeholder="09xxxxxxxx"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">新密碼（不改請留空）</label>
            <input
              v-model="editForm.password"
              type="password"
              placeholder="輸入新密碼"
              class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          <!-- 訊息 -->
          <div v-if="saveMessage" class="sm:col-span-2">
            <p :class="saveSuccess ? 'text-green-600' : 'text-red-600'" class="text-sm">
              {{ saveMessage }}
            </p>
          </div>

          <!-- 按鈕 -->
          <div class="sm:col-span-2 flex flex-col sm:flex-row gap-3 mt-2">
            <button
              class="w-full sm:w-auto px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm sm:text-base disabled:opacity-50"
              :disabled="saving"
              @click="saveProfile"
            >
              {{ saving ? '儲存中...' : '儲存變更' }}
            </button>
            <button
              class="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
              @click="cancelEdit"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <!-- 預約紀錄 -->
      <div class="border-t pt-6 mt-6">
        <h3 class="text-lg font-semibold mb-4">預約紀錄</h3>

        <div v-if="loading" class="text-center py-8">
          <LoadingSpinner />
        </div>

        <div v-else-if="appointments.length === 0" class="text-center py-8 text-gray-500 text-sm">
          尚無預約紀錄
        </div>

        <div v-else class="space-y-3 sm:space-y-4">
          <div
            v-for="apt in appointments"
            :key="apt.id"
            class="border rounded-lg p-3 sm:p-4"
          >
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <!-- 左側資訊 -->
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm sm:text-base">{{ apt.service_name }}</div>
                <div class="text-sm text-gray-600 mt-1">
                  {{ formatDate(apt.appointment_date) }} {{ apt.start_time?.slice(0, 5) }}
                </div>
                <div class="text-sm text-gray-600">美容師：{{ apt.staff_name }}</div>
              </div>

              <!-- 右側金額 + 狀態 -->
              <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 flex-shrink-0">
                <div class="font-bold text-primary-600 text-sm sm:text-base">
                  NT$ {{ Number(apt.price).toLocaleString() }}
                </div>
                <span
                  class="inline-block px-2 py-1 text-xs rounded sm:mt-2"
                  :class="statusClass(apt.status)"
                >
                  {{ statusText(apt.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const appointments = ref<any[]>([])
const loading = ref(false)
const isHovering = ref(false)

const editMode = ref(false)
const saving = ref(false)
const saveMessage = ref('')
const saveSuccess = ref(false)
const avatarPreview = ref<string | null>(null)
const avatarFile = ref<File | null>(null)
const avatarUploaded = ref(false)

const editForm = ref({
  name: '',
  phone: '',
  password: ''
})

const userRole = computed(() => {
  const roles: Record<string, string> = {
    admin: '管理員',
    staff: '美容師',
    customer: '一般會員'
  }
  return roles[user.value?.role || ''] || '一般會員'
})

const startEdit = () => {
  editForm.value = {
    name: user.value?.name || '',
    phone: user.value?.phone || '',
    password: ''
  }
  saveMessage.value = ''
  editMode.value = true
}

const cancelEdit = () => {
  editMode.value = false
  avatarPreview.value = null
  avatarFile.value = null
  saveMessage.value = ''
}

const handleAvatarChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarPreview.value = URL.createObjectURL(file)

  const formData = new FormData()
  formData.append('avatar', file)
  try {
    await apiClient.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    await authStore.fetchProfile()
    avatarUploaded.value = true
    setTimeout(() => {
      avatarUploaded.value = false
      isHovering.value = false 

    }, 3000)
  } catch (e) {
    alert('上傳失敗，請稍後再試')
  }
}

const saveProfile = async () => {
  saving.value = true
  saveMessage.value = ''
  try {
    // 上傳大頭照
    if (avatarFile.value) {
      const formData = new FormData()
      formData.append('avatar', avatarFile.value)
      await apiClient.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }

    // 更新資料
    const payload: any = {
      name: editForm.value.name,
      phone: editForm.value.phone
    }
    if (editForm.value.password) {
      payload.password = editForm.value.password
    }

    await apiClient.put('/auth/profile', payload)
    await authStore.fetchProfile()

    saveSuccess.value = true
    saveMessage.value = '資料已更新成功！'
    editMode.value = false
    avatarFile.value = null
  } catch (e: any) {
    saveSuccess.value = false
    saveMessage.value = e?.message || '更新失敗，請稍後再試'
  } finally {
    saving.value = false
  }
}

const statusClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const statusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待確認',
    confirmed: '已確認',
    completed: '已完成',
    cancelled: '已取消'
  }
  return texts[status] || status
}

const formatDate = (date: string) => {
  const d = new Date(date)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

onMounted(async () => {
  loading.value = true
  try {
    const response = await apiClient.get('/appointments/my')
    appointments.value = response.data || []
  } catch (error) {
    console.error('Failed to load appointments:', error)
  } finally {
    loading.value = false
  }
})
</script>