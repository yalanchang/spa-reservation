<template>
  <div class="relative">
    <input
      :id="id"
      v-model="model"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      required
      :class="variant === 'admin'
        ? 'w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
        : 'w-full border border-gray-300 rounded-lg py-2 pl-4 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent'"
    />
    <button
      type="button"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      :aria-label="visible ? '隱藏密碼' : '顯示密碼'"
      @click="visible = !visible"
    >
      <EyeSlashIcon v-if="visible" class="h-5 w-5" />
      <EyeIcon v-else class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

withDefaults(
  defineProps<{ id?: string; autocomplete?: string; variant?: 'site' | 'admin' }>(),
  { autocomplete: 'current-password', variant: 'site' }
)
const model = defineModel<string>({ default: '' })
const visible = ref(false)
</script>
