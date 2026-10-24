<template>
  <!-- 後台：自己的版型 -->
  <template v-if="route.meta.layout === 'admin'">
    <router-view />
    <ConfirmDialog />
  </template>

  <div v-else class="min-h-screen bg-cream flex flex-col">
    <Navbar />
    <main class="container mx-auto px-4 py-8 flex-1">
      <router-view v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </router-view>
    </main>
    <Footer />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/layout/Navbar.vue'
import Footer from '@/components/layout/Footer.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useAppointmentReminder } from '@/composables/useAppointmentReminder'

const authStore = useAuthStore()
const route = useRoute()
useAppointmentReminder()

onMounted(async () => {
  if (authStore.token) {
    await authStore.fetchProfile()
  }
})
</script>