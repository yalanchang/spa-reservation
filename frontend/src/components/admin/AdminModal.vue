<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <!-- 手機從底部滑出（bottom sheet），桌機置中 -->
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
        @click.self="emit('close')"
      >
        <div
          class="sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-lg"
          :class="wide ? 'sm:max-w-2xl' : 'sm:max-w-md'"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <span class="h-1 w-10 rounded-full bg-gray-300"></span>
          </div>
          <!-- 標題列固定在上方，內容自己捲動 -->
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 py-2 pl-5 pr-3">
            <h3 class="truncate font-medium text-gray-900">{{ title }}</h3>
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="關閉"
              @click="emit('close')"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
          <div class="overflow-y-auto overscroll-contain p-5 text-sm text-gray-700">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ open: boolean; title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

// 開著的時候鎖住背後頁面，手機上滑動視窗內容才不會連帶捲動底下的頁面
const lockScroll = (lock: boolean) => {
  document.body.style.overflow = lock ? 'hidden' : ''
}

watch(
  () => props.open,
  (open) => {
    lockScroll(open)
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)
onUnmounted(() => {
  lockScroll(false)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
@media (max-width: 639px) {
  .sheet {
    animation: sheet-up 0.22s ease-out;
  }
}
@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
}
</style>
