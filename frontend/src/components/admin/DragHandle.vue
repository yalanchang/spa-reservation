<template>
  <!-- 滑鼠、觸控拖曳用；鍵盤用上下方向鍵移動 -->
  <button
    type="button"
    data-drag-handle
    class="flex h-8 w-8 touch-none items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
    :class="disabled ? '' : 'cursor-grab active:cursor-grabbing'"
    :disabled="disabled"
    :aria-label="`拖曳或用上下方向鍵調整「${label}」的順序`"
    :title="disabled ? disabledHint : '拖曳調整順序'"
    @keydown.up.prevent="emit('move', -1)"
    @keydown.down.prevent="emit('move', 1)"
  >
    <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5" aria-hidden="true">
      <circle cx="7" cy="5" r="1.5" />
      <circle cx="13" cy="5" r="1.5" />
      <circle cx="7" cy="10" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="7" cy="15" r="1.5" />
      <circle cx="13" cy="15" r="1.5" />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean; disabledHint?: string }>()
const emit = defineEmits<{ move: [delta: number] }>()
</script>
