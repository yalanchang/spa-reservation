<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
      @click.self="emit('close')"
    >
      <div
        class="max-h-[90vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-xl sm:rounded-lg"
        :class="wide ? 'sm:max-w-2xl' : 'sm:max-w-md'"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 class="font-medium text-gray-900">{{ title }}</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" aria-label="關閉" @click="emit('close')">
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>
        <div class="p-5 text-sm text-gray-700">
          <slot />
        </div>
      </div>
    </div>
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

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
