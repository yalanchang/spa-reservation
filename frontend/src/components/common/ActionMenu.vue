<template>
  <button
    ref="trigger"
    type="button"
    class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    :class="{ 'bg-gray-50': open }"
    :disabled="disabled"
    :aria-expanded="open"
    aria-haspopup="menu"
    @click="toggle"
  >
    <LoadingSpinner v-if="loading" size="sm" />
    <template v-else>
      {{ label }}
      <ChevronDownIcon class="h-3.5 w-3.5 text-gray-400" />
    </template>
  </button>

  <!-- 放到 body，避免被表格的捲動容器裁掉 -->
  <Teleport to="body">
    <div
      v-if="open"
      ref="menu"
      role="menu"
      class="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
      :style="position"
    >
      <button
        v-for="item in items"
        :key="item.value"
        type="button"
        role="menuitem"
        class="block w-full px-3 py-1.5 text-left hover:bg-gray-100"
        :class="item.danger ? 'text-red-600' : 'text-gray-700'"
        @click="select(item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

withDefaults(
  defineProps<{
    items: { value: string; label: string; danger?: boolean }[]
    label?: string
    disabled?: boolean
    loading?: boolean
  }>(),
  { label: '操作', disabled: false, loading: false }
)
const emit = defineEmits<{ select: [value: string] }>()

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const position = ref<Record<string, string>>({})

const place = () => {
  if (!trigger.value) return
  const rect = trigger.value.getBoundingClientRect()
  const menuHeight = menu.value?.offsetHeight || 0
  // 下方空間不夠時往上開
  const openUp = rect.bottom + menuHeight + 8 > window.innerHeight
  position.value = {
    right: `${window.innerWidth - rect.right}px`,
    top: openUp ? `${rect.top - menuHeight - 4}px` : `${rect.bottom + 4}px`
  }
}

const close = () => {
  open.value = false
  document.removeEventListener('mousedown', onOutside)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
}

const onOutside = (e: MouseEvent) => {
  const target = e.target as Node
  if (!trigger.value?.contains(target) && !menu.value?.contains(target)) close()
}

const toggle = async () => {
  if (open.value) return close()
  open.value = true
  place()
  await nextTick()
  place()
  document.addEventListener('mousedown', onOutside)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
}

const select = (value: string) => {
  close()
  emit('select', value)
}

onUnmounted(close)
</script>
