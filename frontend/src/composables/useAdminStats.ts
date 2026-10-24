import { ref } from 'vue'
import apiClient from '@/api/client'

// 後台側邊欄的待辦數字與各頁統計共用
const stats = ref<any>(null)

export const refreshAdminStats = async () => {
  try {
    const res = (await apiClient.get('/admin/stats')) as any
    stats.value = res.data
  } catch (error) {
    console.error('Load admin stats failed:', error)
  }
}

export const useAdminStats = () => ({ stats, refresh: refreshAdminStats })
