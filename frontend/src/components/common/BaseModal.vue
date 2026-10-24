<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
        @click.self="emit('close')"
      >
        <div
          class="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:max-w-md sm:rounded-3xl"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="flex items-center justify-between px-6 pt-6">
            <h3 class="text-lg font-bold text-cocoa">{{ title }}</h3>
            <button type="button" class="text-gray-400 hover:text-gray-600" aria-label="關閉" @click="emit('close')">
              <XMarkIcon class="h-6 w-6" />
            </button>
          </div>
          <div class="p-6">
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

const props = defineProps<{ open: boolean; title: string }>()
const emit = defineEmits<{ close: [] }>()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}

// 開著時才監聽 Esc
watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
)
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
