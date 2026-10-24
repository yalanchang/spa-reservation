<template>
  <div class="flex justify-center items-center" :style="size === 'sm' ? { height: '1.5em' } : undefined">
    <div
      class="animate-spin rounded-full"
      :class="
        size === 'sm'
          ? 'h-5 w-5 border-2 border-current border-t-transparent'
          : 'h-12 w-12 border-b-2 border-primary-600'
      "
    ></div>
  </div>
</template>

<script setup lang="ts">
// sm：放在按鈕裡，顏色跟著文字顏色
withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })
</script>
