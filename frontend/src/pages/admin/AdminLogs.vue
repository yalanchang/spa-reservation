<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model.trim="keyword"
        type="search"
        placeholder="搜尋動作、對象、操作人"
        class="admin-input sm:!w-72"
        @keyup.enter="load"
      />
      <button type="button" class="admin-btn-outline" @click="load">搜尋</button>
      <span class="ml-auto text-xs text-gray-500">顯示最近 300 筆</span>
    </div>

    <div class="admin-panel overflow-x-auto">
      <table v-stack-table class="admin-table min-w-[720px]">
        <thead>
          <tr>
            <th class="w-44">時間</th>
            <th class="w-28">操作人</th>
            <th class="w-36">動作</th>
            <th>對象</th>
            <th>內容</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="py-12"><LoadingSpinner /></td>
          </tr>
          <tr v-else-if="!logs.length">
            <td colspan="5" class="py-12 text-center text-gray-400">沒有紀錄</td>
          </tr>
          <tr v-for="log in logs" v-else :key="log.id">
            <td class="whitespace-nowrap tabular-nums text-gray-500">{{ formatTime(log.created_at) }}</td>
            <td class="text-gray-900">{{ log.user_name || '（已刪除）' }}</td>
            <td>{{ log.action }}</td>
            <td class="text-gray-600">{{ log.target }}</td>
            <td class="text-gray-500">{{ log.detail }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

const toast = useToast()
const logs = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')

const formatTime = (value: string) => new Date(value).toLocaleString('sv-SE').slice(0, 16)

const load = async () => {
  loading.value = true
  try {
    const res = (await apiClient.get('/admin/logs', { params: { q: keyword.value } })) as any
    logs.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '紀錄載入失敗')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
