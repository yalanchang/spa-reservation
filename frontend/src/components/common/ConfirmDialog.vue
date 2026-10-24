<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="confirmState.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="closeConfirm(false)"
      >
        <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
          <div
            class="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
            :class="confirmState.options.danger ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'"
          >
            <ExclamationTriangleIcon class="w-6 h-6" />
          </div>
          <h3 class="text-lg font-semibold text-gray-900">{{ confirmState.options.title }}</h3>
          <p v-if="confirmState.options.message" class="mt-2 text-sm text-gray-500">
            {{ confirmState.options.message }}
          </p>
          <div class="mt-6 flex gap-3">
            <button
              class="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 transition hover:font-bold"
              @click="closeConfirm(false)"
            >
              {{ confirmState.options.cancelText || '取消' }}
            </button>
            <button
              class="flex-1 py-2 rounded-lg text-white transition"
              :class="confirmState.options.danger ? 'bg-red-600 hover:font-bold' : 'bg-primary-600 hover:font-bold'"
              @click="closeConfirm(true)"
            >
              {{ confirmState.options.confirmText || '確定' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { confirmState, closeConfirm } from '@/composables/useConfirm'

// Esc 取消、Enter 確定（輸入法選字中的 Enter 不算）
const onKeydown = (e: KeyboardEvent) => {
  if (!confirmState.open || e.isComposing) return
  if (e.key === 'Escape') closeConfirm(false)
  if (e.key === 'Enter') {
    e.preventDefault()
    closeConfirm(true)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
