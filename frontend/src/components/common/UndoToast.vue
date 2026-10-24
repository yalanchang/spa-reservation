<template>
  <div class="flex items-center gap-4">
    <span class="flex-1">{{ message }}</span>
    <button
      type="button"
      class="shrink-0 rounded-full border border-white/60 px-3 py-1 text-sm font-semibold hover:bg-white/15"
      @click.stop="undo"
    >
      復原
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ message: string; onUndo: () => void }>()
const emit = defineEmits<{ 'close-toast': [] }>()

const undo = () => {
  props.onUndo()
  emit('close-toast')
}
</script>
