<template>
  <div class="space-y-6">
    <!-- 新增 -->
    <form class="rounded-md border border-gray-200 bg-white p-4 lg:p-5" @submit.prevent="createUser">
      <h2 class="text-sm font-medium text-gray-900">新增後台帳號</h2>
      <p class="mt-1 text-xs text-gray-500">後台帳號與前台會員分開，建立後請把電子郵件與初始密碼交給對方，對方可再用「忘記密碼」自行更改</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_8rem_auto] lg:items-end">
        <div>
          <label for="new-name" class="mb-1 block text-xs text-gray-500">姓名</label>
          <input id="new-name" v-model="form.name" required class="admin-input" />
        </div>
        <div>
          <label for="new-email" class="mb-1 block text-xs text-gray-500">電子郵件</label>
          <input id="new-email" v-model="form.email" type="email" required autocomplete="off" class="admin-input" />
        </div>
        <div>
          <label for="new-password" class="mb-1 block text-xs text-gray-500">初始密碼（至少 6 個字元）</label>
          <PasswordInput id="new-password" v-model="form.password" variant="admin" autocomplete="new-password" />
        </div>
        <div>
          <label for="new-role" class="mb-1 block text-xs text-gray-500">角色</label>
          <select id="new-role" v-model="form.role" class="admin-input">
            <option value="staff">美容師</option>
            <option value="admin">管理員</option>
          </select>
        </div>
        <button
          type="submit"
          class="flex min-w-[5rem] justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          :disabled="creating"
        >
          <LoadingSpinner v-if="creating" size="sm" />
          <template v-else>新增</template>
        </button>
      </div>
    </form>

    <!-- 列表 -->
    <div class="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="px-4 py-2.5 font-medium">姓名</th>
            <th class="px-4 py-2.5 font-medium">電子郵件</th>
            <th class="px-4 py-2.5 font-medium">角色</th>
            <th class="px-4 py-2.5 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="loading">
            <td colspan="4" class="py-12"><LoadingSpinner /></td>
          </tr>
          <tr v-for="user in users" v-else :key="user.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900">
              {{ user.name }}
              <span v-if="user.id === authStore.user?.id" class="ml-1 text-xs font-normal text-gray-400">（你）</span>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ user.email }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="user.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'"
              >
                {{ ROLE_LABELS[user.role] }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <ActionMenu
                v-if="user.id !== authStore.user?.id"
                label="變更"
                :items="menuItems(user)"
                :loading="updatingId === user.id"
                :disabled="updatingId === user.id"
                @select="(role) => changeRole(user, role)"
              />
              <span v-else class="text-xs text-gray-300">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-gray-500">管理員可以使用所有後台功能；美容師可以管理預約、心得與查看會員</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useConfirm } from '@/composables/useConfirm'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import ActionMenu from '@/components/common/ActionMenu.vue'
import PasswordInput from '@/components/common/PasswordInput.vue'

const ROLE_LABELS: Record<string, string> = { admin: '管理員', staff: '美容師' }

const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()

const users = ref<any[]>([])
const loading = ref(true)
const updatingId = ref<number | null>(null)
const creating = ref(false)
const form = ref({ name: '', email: '', password: '', role: 'staff' })

const menuItems = (user: any) =>
  [
    { value: 'admin', label: '設為管理員' },
    { value: 'staff', label: '設為美容師' },
    { value: 'deactivate', label: '停用帳號', danger: true }
  ].filter(item => item.value !== user.role)

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await apiClient.get('/admin/users') as any
    users.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '帳號載入失敗')
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  if (form.value.password.length < 6) {
    toast.warning('初始密碼至少要 6 個字元')
    return
  }
  creating.value = true
  try {
    await apiClient.post('/admin/users', form.value)
    toast.success(`已建立 ${form.value.name} 的帳號`)
    form.value = { name: '', email: '', password: '', role: 'staff' }
    await fetchUsers()
  } catch (error: any) {
    toast.error(error?.message || '建立失敗，請稍後再試')
  } finally {
    creating.value = false
  }
}

const changeRole = async (user: any, action: string) => {
  if (action === 'deactivate') {
    const ok = await confirm({
      title: `確定要停用 ${user.name} 的帳號嗎？`,
      message: '停用後對方就無法登入',
      confirmText: '停用',
      danger: true
    })
    if (!ok) return
  }

  updatingId.value = user.id
  try {
    if (action === 'deactivate') {
      await apiClient.patch(`/admin/users/${user.id}/deactivate`)
      toast.success(`已停用 ${user.name} 的帳號`)
    } else {
      await apiClient.patch(`/admin/users/${user.id}/role`, { role: action })
      toast.success(`${user.name} 已設為${ROLE_LABELS[action]}`)
    }
    await fetchUsers()
  } catch (error: any) {
    toast.error(error?.message || '更新失敗，請稍後再試')
  } finally {
    updatingId.value = null
  }
}

onMounted(fetchUsers)
</script>
