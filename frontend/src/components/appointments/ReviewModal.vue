<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:px-4"
      @click.self="emit('close')"
    >
      <div class="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-xl">
        <div class="flex items-start justify-between p-6 pb-0">
          <div>
            <h3 class="text-lg font-bold text-cocoa">撰寫心得</h3>
            <p class="text-sm text-gray-500 mt-1">
              {{ appointment.service_name }}，美容師 {{ appointment.staff_name }}
            </p>
          </div>
          <button class="text-gray-400 hover:text-gray-600" aria-label="關閉" @click="emit('close')">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>

        <div class="p-6 space-y-5">
          <div class="text-center">
            <StarRating v-model="rating" size="lg" />
            <p class="mt-2 h-5 text-sm font-medium text-primary-600">{{ ratingLabel }}</p>
          </div>

          <div>
            <textarea
              v-model="comment"
              rows="5"
              maxlength="500"
              placeholder="分享這次的體驗，例如美容師的手技、環境、效果等"
              class="w-full border rounded-2xl p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :class="{ 'border-red-500': showErrors && commentError }"
              @keydown.enter="onEnter"
            ></textarea>
            <div class="mt-1 flex justify-between text-xs">
              <span class="text-red-500">{{ showErrors ? commentError : '' }}</span>
              <span class="text-gray-400">Enter 送出，Shift + Enter 換行，{{ comment.trim().length }} / 500</span>
            </div>
          </div>
        </div>

        <div class="flex gap-3 p-6 pt-0">
          <button class="btn-cute-outline flex-1 py-2.5" @click="emit('close')">取消</button>
          <button
            class="btn-cute flex-1 py-2.5 disabled:opacity-50 disabled:pointer-events-none"
            :disabled="saving"
            @click="submit"
          >
            <LoadingSpinner v-if="saving" size="sm" />
            <template v-else>送出心得</template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useToast } from 'vue-toastification'
import apiClient from '@/api/client'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import StarRating from '@/components/common/StarRating.vue'

const props = defineProps<{ appointment: any }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const toast = useToast()
const rating = ref(0)
const comment = ref('')
const saving = ref(false)
const showErrors = ref(false)

const ratingLabel = computed(() => ['', '不太滿意', '普通', '還不錯', '很滿意', '非常滿意'][rating.value])

const commentError = computed(() => {
  const length = comment.value.trim().length
  if (length < 5) return '至少寫 5 個字'
  return ''
})

// Enter 送出、Shift+Enter 換行；輸入法選字中的 Enter 不送出
const onEnter = (e: KeyboardEvent) => {
  if (e.shiftKey || e.isComposing) return
  e.preventDefault()
  if (!saving.value) submit()
}

const submit = async () => {
  if (!rating.value) {
    toast.warning('請先選擇星等')
    return
  }
  if (commentError.value) {
    showErrors.value = true
    toast.warning('心得至少寫 5 個字')
    return
  }

  saving.value = true
  try {
    await apiClient.post('/reviews', {
      appointmentId: props.appointment.id,
      rating: rating.value,
      comment: comment.value
    })
    toast.success('感謝你的心得')
    emit('saved')
  } catch (error: any) {
    toast.error(error?.message || '送出失敗，請稍後再試')
  } finally {
    saving.value = false
  }
}
</script>
