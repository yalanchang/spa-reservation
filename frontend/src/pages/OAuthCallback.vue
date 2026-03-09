<template>
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600">登入中，請稍候...</p>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  
  onMounted(() => {
    const { token, name, email, role, id, avatar } = route.query
  
    if (token) {
      // 存入 store 和 localStorage
      const user = {
        id: Number(id),
        name: decodeURIComponent(name as string),
        email: decodeURIComponent(email as string),
        role: role as string,
        avatar: decodeURIComponent(avatar as string) || undefined
      }
      authStore.token = token as string
      authStore.user = user
      localStorage.setItem('token', token as string)
      localStorage.setItem('user', JSON.stringify(user))
      router.push('/')
    } else {
      router.push('/login?error=oauth_failed')
    }
  })
  </script>