<template>
  <div
    class="flex overflow-hidden rounded-2xl border bg-white"
    :class="muted ? 'border-gray-200' : 'border-primary-200'"
  >
    <!-- 左邊：折扣金額 -->
    <div
      class="relative flex w-28 shrink-0 flex-col items-center justify-center px-2 py-5 text-center sm:w-32"
      :class="muted ? 'bg-gray-100 text-gray-400' : 'bg-primary-600 text-white'"
    >
      <p
        class="font-extrabold leading-none"
        :class="couponValueText(coupon).length > 5 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'"
      >
        {{ couponValueText(coupon) }}
      </p>
      <p v-if="coupon.discount_type !== 'percent'" class="mt-1 text-xs opacity-90">折抵</p>
      <!-- 票券缺口 -->
      <span class="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-cream"></span>
      <span class="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-cream"></span>
    </div>

    <!-- 右邊：名稱與條件 -->
    <div
      class="flex min-w-0 flex-1 items-center gap-3 border-l-2 border-dashed px-4 py-3"
      :class="muted ? 'border-gray-200' : 'border-primary-100'"
    >
      <div class="min-w-0 flex-1">
        <span
          class="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
          :class="muted ? 'bg-gray-100 text-gray-500' : 'bg-primary-50 text-primary-600'"
        >
          {{ coupon.audience_label }}
        </span>
        <p class="mt-1 truncate font-bold" :class="muted ? 'text-gray-400' : 'text-cocoa'">{{ coupon.name }}</p>
        <p class="mt-0.5 text-xs text-gray-500">{{ couponConditionText(coupon) }}</p>
        <p class="text-xs text-gray-400">{{ couponPeriodText(coupon) }}</p>
        <p v-if="note" class="mt-1 text-xs" :class="muted ? 'text-gray-500' : 'text-primary-600'">{{ note }}</p>
      </div>
      <div class="shrink-0">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { couponValueText, couponConditionText, couponPeriodText } from '@/utils/coupon'

defineProps<{ coupon: any; muted?: boolean; note?: string | null }>()
</script>
