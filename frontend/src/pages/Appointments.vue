<template>
    <div class="appointments-page">
      <div class="page-header">
        <h1>我的預約</h1>
      </div>
  
      <div class="container">
        <div v-if="loading" class="loading">載入中...</div>
  
        <div v-else-if="appointments.length === 0" class="empty">
          <p>您目前沒有任何預約</p>
          <router-link to="/booking" class="btn btn-primary">立即預約</router-link>
        </div>
  
        <div v-else class="appointments-list">
          <!-- 篩選 -->
          <div class="filter-tabs">
            <button
              v-for="f in filters"
              :key="f.value"
              :class="['tab', { active: activeFilter === f.value }]"
              @click="activeFilter = f.value"
            >
              {{ f.label }}
            </button>
          </div>
  
          <div v-for="appt in filteredAppointments" :key="appt.id" class="appt-card">
            <div class="appt-header">
              <span :class="['badge', `badge-${appt.status}`]">{{ statusLabel(appt.status) }}</span>
              <span class="appt-date">{{ formatDate(appt.appointment_date) }} {{ formatTime(appt.start_time) }}</span>            </div>
            <div class="appt-body">
              <h3>{{ appt.service_name }}</h3>
              <div class="appt-detail">
                <span>美容師：{{ appt.staff_name }}</span>
                <span>時程：{{ appt.duration }} 分鐘</span>
                <span class="price">NT$ {{ Number(appt.price).toLocaleString() }}</span>
              </div>
              <p v-if="appt.notes" class="appt-notes">📝 {{ appt.notes }}</p>
            </div>
            <div class="appt-actions" v-if="appt.status === 'pending' || appt.status === 'confirmed'">
              <button class="btn btn-danger btn-sm" @click="cancelAppt(appt.id)">取消預約</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import apiClient from '@/api/client'
  
  const appointments = ref<any[]>([])
  const loading = ref(true)
  const activeFilter = ref('all')
  const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

const formatTime = (timeStr: string) => {
  return timeStr?.slice(0, 5)
}
  const filters = [
    { label: '全部', value: 'all' },
    { label: '待確認', value: 'pending' },
    { label: '已確認', value: 'confirmed' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
  ]
  
  const statusLabel = (s: string) => ({
    pending: '待確認', confirmed: '已確認',
    completed: '已完成', cancelled: '已取消'
  }[s] || s)
  
  const filteredAppointments = computed(() =>
    activeFilter.value === 'all'
      ? appointments.value
      : appointments.value.filter(a => a.status === activeFilter.value)
  )
  
  const fetchAppointments = async () => {
    try {
      const res = await apiClient.get('/appointments/my')
      console.log('API response:', res) 
      appointments.value = res.data || []
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }
  
  const cancelAppt = async (id: number) => {
    if (!confirm('確定要取消此預約嗎？')) return
    try {
      await apiClient.patch(`/appointments/${id}/cancel`)
      await fetchAppointments()
    } catch (e) {
      alert('取消失敗，請稍後再試')
    }
  }
  
  onMounted(fetchAppointments)
  </script>
  
  <style scoped>
  .appointments-page { padding-bottom: 80px; }
  .page-header { text-align: center; padding: 60px 20px 40px; }
  .page-header h1 { font-size: 2.5rem; font-weight: 300; margin-bottom: 8px; }
  .page-header p { color: #8a7570; }
  .container { max-width: 800px; margin: 0 auto; padding: 0 24px; }
  .loading, .empty { text-align: center; padding: 60px; color: #8a7570; }
  .empty a { display: inline-block; margin-top: 16px; }
  
  .filter-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
  .tab {
    padding: 8px 18px; border: 1.5px solid #e5ddd8; border-radius: 50px;
    background: white; cursor: pointer; font-size: 0.88rem; transition: all 0.2s;
  }
  .tab.active { background: #2c1a14; color: white; border-color: #2c1a14; }
  
  .appt-card {
    background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(44,26,20,0.08);
    padding: 24px 28px; margin-bottom: 16px;
  }
  .appt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .appt-date { font-size: 0.88rem; color: #8a7570; }
  .appt-body h3 { font-size: 1.4rem; font-weight: 400; margin-bottom: 8px; }
  .appt-detail { display: flex; gap: 20px; font-size: 0.88rem; color: #8a7570; flex-wrap: wrap; }
  .price { color: #c9856a; font-weight: 500; }
  .appt-notes { font-size: 0.85rem; color: #8a7570; margin-top: 8px; }
  .appt-actions { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0e8e0; }
  
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }
  .badge-pending { background: #fff3cd; color: #856404; }
  .badge-confirmed { background: #d1ecf1; color: #0c5460; }
  .badge-completed { background: #d4edda; color: #155724; }
  .badge-cancelled { background: #f8d7da; color: #721c24; }
  
  .btn { display: inline-flex; align-items: center; padding: 10px 24px; border: none; border-radius: 50px; cursor: pointer; font-size: 0.88rem; transition: all 0.2s; }
  .btn-primary { background: #2c1a14; color: white; }
  .btn-danger { background: #c96a6a; color: white; }
  .btn-sm { padding: 7px 16px; font-size: 0.82rem; }
  </style>