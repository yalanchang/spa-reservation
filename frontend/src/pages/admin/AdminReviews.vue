<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-2 border-b border-gray-200 text-sm">
      <div class="flex gap-1">
        <button
          v-for="f in filters"
          :key="f.value"
          class="-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1"
          :class="
            filter === f.value
              ? 'border-blue-600 font-medium text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          "
          @click="filter = f.value"
        >
          {{ f.label }}
          <span v-if="f.count" class="ml-1 rounded bg-red-50 px-1.5 text-xs text-red-600">{{ f.count }}</span>
        </button>
      </div>
      <p v-if="stats?.reviewCount" class="pb-2.5 text-gray-500">
        平均 {{ stats.averageRating }} 分，共 {{ stats.reviewCount }} 則
      </p>
    </div>

    <div class="rounded-md border border-gray-200 bg-white">
      <AdminLoading v-if="loading" />
      <p v-else-if="!reviews.length" class="py-12 text-center text-sm text-gray-400">
        {{ filter === 'unreplied' ? '所有心得都已回覆' : '還沒有顧客心得' }}
      </p>

      <div v-else class="divide-y divide-gray-100">
        <div v-for="review in reviews" :key="review.id" class="px-4 py-4 text-sm lg:px-5">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="font-medium text-gray-900">{{ review.user_name }}</span>
            <StarRating :model-value="review.rating" readonly size="sm" />
            <span class="text-gray-500">
              {{ review.service_name }}，{{ review.staff_name }}，{{ formatDateWithWeekday(review.appointment_date) }}
              {{ review.start_time.slice(0, 5) }}
            </span>
            <span
              class="ml-auto rounded px-2 py-0.5 text-xs font-medium"
              :class="review.staff_reply ? 'bg-gray-100 text-gray-500' : 'bg-red-50 text-red-600'"
            >
              {{ review.staff_reply ? '已回覆' : '未回覆' }}
            </span>
          </div>

          <p class="mt-2 whitespace-pre-line text-gray-700">{{ review.comment }}</p>

          <!-- 回覆 -->
          <div
            v-if="editingId !== review.id && review.staff_reply"
            class="mt-3 flex items-start justify-between gap-3 rounded-md bg-gray-50 px-3 py-2"
          >
            <p class="text-gray-700"><span class="text-gray-500">店家回覆：</span>{{ review.staff_reply }}</p>
            <button class="shrink-0 text-blue-600 hover:underline" @click="startEdit(review)">編輯</button>
          </div>
          <div v-else class="mt-3">
            <textarea
              v-model="drafts[review.id]"
              rows="2"
              maxlength="500"
              placeholder="回覆這則心得，會顯示在服務介紹頁與顧客的預約紀錄"
              class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              @keydown.enter="onReplyEnter($event, review)"
            ></textarea>
            <p class="mt-1 text-xs text-gray-400">Enter 送出，Shift + Enter 換行</p>
            <div class="mt-2 flex justify-end gap-2">
              <button
                v-if="review.staff_reply"
                class="rounded-md border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
                @click="editingId = null"
              >
                取消
              </button>
              <button
                class="min-w-[4.5rem] rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                :disabled="savingId === review.id"
                @click="saveReply(review)"
              >
                <LoadingSpinner v-if="savingId === review.id" size="sm" />
                <template v-else>送出回覆</template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import AdminLoading from '@/components/admin/AdminLoading.vue'
import StarRating from '@/components/common/StarRating.vue'
import { useAdminStats } from '@/composables/useAdminStats'
import { formatDateWithWeekday } from '@/utils/appointmentStatus'

const toast = useToast()
const { stats, refresh: refreshStats } = useAdminStats()

const filter = ref('all')
const reviews = ref<any[]>([])
const loading = ref(true)
const drafts = ref<Record<number, string>>({})
const editingId = ref<number | null>(null)
const savingId = ref<number | null>(null)

const filters = computed(() => [
  { value: 'all', label: '全部' },
  { value: 'unreplied', label: '未回覆', count: stats.value?.unreplied }
])

const fetchReviews = async () => {
  loading.value = true
  try {
    const res = (await apiClient.get('/admin/reviews', {
      params: { unreplied: filter.value === 'unreplied' ? 1 : undefined }
    })) as any
    reviews.value = res.data || []
  } catch (error: any) {
    toast.error(error?.message || '心得載入失敗')
  } finally {
    loading.value = false
  }
}

const startEdit = (review: any) => {
  drafts.value[review.id] = review.staff_reply || ''
  editingId.value = review.id
}

// Enter 送出、Shift+Enter 換行；輸入法選字中的 Enter 不送出
const onReplyEnter = (e: KeyboardEvent, review: any) => {
  if (e.shiftKey || e.isComposing) return
  e.preventDefault()
  if (savingId.value !== review.id) saveReply(review)
}

const saveReply = async (review: any) => {
  const reply = (drafts.value[review.id] || '').trim()
  if (!reply && !review.staff_reply) {
    toast.warning('請輸入回覆內容')
    return
  }

  savingId.value = review.id
  try {
    const res = (await apiClient.put(`/admin/reviews/${review.id}/reply`, { reply })) as any
    toast.success(res.message || '已回覆')
    editingId.value = null
    await Promise.all([fetchReviews(), refreshStats()])
  } catch (error: any) {
    toast.error(error?.message || '回覆失敗，請稍後再試')
  } finally {
    savingId.value = null
  }
}

watch(filter, fetchReviews)
onMounted(fetchReviews)
</script>
