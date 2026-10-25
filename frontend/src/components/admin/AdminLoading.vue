<template>
  <!-- 後台載入中：固定在內容區正中間，不跟著表格寬度跑掉 -->
  <div
    class="flex items-center justify-center"
    :class="compact ? 'py-16' : 'min-h-[50vh]'"
    role="status"
    aria-label="載入中"
  >
    <LoadingSpinner tone="admin" />
  </div>
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

// compact：放在彈出視窗或區塊裡，不撐滿半個畫面
defineProps<{ compact?: boolean }>()
</script>
