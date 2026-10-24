<template>
  <div class="inline-flex items-center gap-0.5" @mouseleave="hover = 0">
    <component
      :is="readonly ? 'span' : 'button'"
      v-for="n in 5"
      :key="n"
      :type="readonly ? undefined : 'button'"
      :aria-label="readonly ? undefined : `${n} 顆星`"
      class="transition"
      :class="readonly ? '' : 'hover:scale-125 active:scale-90'"
      @mouseenter="!readonly && (hover = n)"
      @click="!readonly && emit('update:modelValue', n)"
    >
      <StarIcon :class="[sizeClass, n <= shown ? 'text-amber-400' : 'text-gray-200']" />
    </component>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { StarIcon } from '@heroicons/vue/24/solid'

const props = withDefaults(defineProps<{ modelValue: number; readonly?: boolean; size?: 'sm' | 'md' | 'lg' }>(), {
  readonly: false,
  size: 'md'
})
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const hover = ref(0)
// 滑過時先預覽，離開後顯示實際分數
const shown = computed(() => hover.value || Math.round(props.modelValue))
const sizeClass = computed(() => ({ sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-9 h-9' })[props.size])
</script>
