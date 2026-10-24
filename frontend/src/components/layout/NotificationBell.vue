<template>
  <div ref="root" class="relative" @mouseenter="onEnter" @mouseleave="onLeave">
    <button
      class="group relative flex h-10 w-10 items-center justify-center rounded-full text-cocoa transition hover:text-primary-600 hover:font-bold"
      :class="{ 'bg-primary-50 text-primary-600': open }"
      :aria-label="count ? `通知，${count} 則提醒` : '通知'"
      :aria-expanded="open"
      @click="open = !open"
    >
      <BellIcon class="h-6 w-6 origin-top group-hover:animate-wiggle" />
      <span
        v-if="count"
        class="absolute right-0.5 top-0.5 min-w-[1.125rem] rounded-full bg-primary-500 px-1 text-center text-[0.65rem] font-bold leading-[1.125rem] text-white ring-2 ring-white"
      >
        {{ count > 9 ? '9+' : count }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1 scale-95"
    >
      <!-- pt-2 讓滑鼠從鈴鐺移到面板時不會中斷 hover -->
      <div v-if="open" class="absolute right-0 top-full z-50 w-80 max-w-[calc(100vw-2rem)] origin-top-right pt-2">
        <div class="overflow-hidden rounded-2xl bg-white shadow-soft-lg ring-1 ring-primary-100">
          <div class="flex items-center justify-between border-b border-primary-50 px-4 py-3">
            <p class="font-bold text-cocoa">提醒</p>
            <span v-if="count" class="text-xs text-gray-400">{{ count }} 則</span>
          </div>

          <div class="max-h-96 overflow-y-auto">
            <p v-if="!count" class="px-4 py-8 text-center text-sm text-gray-400">目前沒有新的提醒</p>

            <template v-if="notices.length">
              <p class="px-4 pt-3 text-xs font-semibold tracking-wider text-primary-500">店家通知</p>
              <router-link
                v-for="appt in notices"
                :key="`nt-${appt.id}`"
                to="/appointments"
                class="flex gap-3 px-4 py-3 transition hover:font-bold"
                @click="open = false"
              >
                <img
                  :src="serviceImage({ name: appt.service_name })"
                  alt=""
                  class="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium text-cocoa">{{ appt.service_name }}</p>
                  <p class="text-xs text-gray-500">
                    {{ formatDate(appt.appointment_date) }} {{ appt.start_time.slice(0, 5) }} 的預約
                    <span
                      class="font-semibold"
                      :class="appt.status_notice === 'cancelled' ? 'text-gray-600' : 'text-primary-600'"
                    >
                      {{ appt.status_notice === 'cancelled' ? '已被店家取消' : '店家已確認' }}
                    </span>
                  </p>
                </div>
              </router-link>
            </template>

            <template v-if="upcoming.length">
              <p class="px-4 pt-3 text-xs font-semibold tracking-wider text-primary-500">即將到來</p>
              <router-link
                v-for="appt in upcoming"
                :key="`up-${appt.id}`"
                to="/appointments"
                class="flex gap-3 px-4 py-3 transition hover:font-bold"
                @click="open = false"
              >
                <img
                  :src="serviceImage({ name: appt.service_name })"
                  alt=""
                  class="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium text-cocoa">{{ appt.service_name }}</p>
                  <p class="text-xs text-gray-500">
                    <span class="font-semibold text-primary-600"
                      >{{ upcomingLabel(appt) }} {{ appt.start_time.slice(0, 5) }}</span
                    >
                    ，美容師 {{ appt.staff_name }}
                  </p>
                </div>
              </router-link>
            </template>

            <template v-if="toReview.length">
              <p class="px-4 pt-3 text-xs font-semibold tracking-wider text-primary-500">等你分享心得</p>
              <router-link
                v-for="appt in toReview"
                :key="`rv-${appt.id}`"
                to="/appointments"
                class="flex gap-3 px-4 py-3 transition hover:font-bold"
                @click="open = false"
              >
                <img
                  :src="serviceImage({ name: appt.service_name })"
                  alt=""
                  class="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-medium text-cocoa">{{ appt.service_name }}</p>
                  <p class="text-xs text-gray-500">{{ formatDate(appt.appointment_date) }} 體驗完成，留下你的感想</p>
                </div>
              </router-link>
            </template>
          </div>

          <router-link
            to="/appointments"
            class="block border-t border-primary-50 py-3 text-center text-sm font-medium text-primary-600 transition hover:font-bold"
            @click="open = false"
          >
            查看我的預約
          </router-link>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { BellIcon } from '@heroicons/vue/24/outline'
import { useReminders, markNoticesRead, refreshReminders } from '@/composables/useAppointmentReminder'
import { upcomingLabel } from '@/utils/appointmentTime'
import { serviceImage } from '@/utils/serviceImage'

const { notices, upcoming, toReview, count } = useReminders()
const open = ref(false)

// 打開面板時把店家通知標成已讀；關掉後重新載入，已讀的通知就會消失
watch(open, (isOpen) => {
  if (isOpen) markNoticesRead()
  else if (notices.value.length) refreshReminders()
})
const root = ref<HTMLElement | null>(null)

// 只有滑鼠裝置用 hover 開關，手機用點擊
const canHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
let closeTimer: ReturnType<typeof setTimeout> | undefined

const onEnter = () => {
  if (!canHover) return
  clearTimeout(closeTimer)
  open.value = true
}

const onLeave = () => {
  if (!canHover) return
  closeTimer = setTimeout(() => (open.value = false), 150)
}

const onClickOutside = (e: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}

const formatDate = (value: string) => {
  const d = new Date(value)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  clearTimeout(closeTimer)
})
</script>
