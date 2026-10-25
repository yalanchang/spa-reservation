<template>
  <!-- 粗一點的圓環：淡色底圈＋主色轉動的一段 -->
  <div class="flex justify-center items-center" :style="size === 'sm' ? { height: '1.5em' } : undefined">
    <div
      class="animate-spin rounded-full"
      :class="
        size === 'sm'
          ? 'h-5 w-5 border-[3px] border-current border-t-transparent'
          : tone === 'admin'
            ? 'h-10 w-10 border-4 border-blue-100 border-t-blue-600'
            : 'h-12 w-12 border-4 border-primary-100 border-t-primary-600'
      "
    ></div>
  </div>
</template>

<script setup lang="ts">
// sm：放在按鈕裡，顏色跟著文字顏色；tone="admin"：後台的藍色
withDefaults(defineProps<{ size?: 'sm' | 'md'; tone?: 'front' | 'admin' }>(), { size: 'md', tone: 'front' })
</script>
