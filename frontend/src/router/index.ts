import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/Home.vue')
    },
    {
      path: '/services',
      name: 'services',
      component: () => import('@/pages/Services.vue')
    },
    {
      path: '/booking',
      name: 'booking',
      component: () => import('@/pages/Booking.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/Login.vue'),
      meta: { guest: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/Profile.vue'),
      meta: { requiresAuth: true }
    },
    {
        path: '/appointments',
        name: 'appointments',
        component: () => import('@/pages/Appointments.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/services/:id',
        name: 'service-detail',
        component: () => import('@/pages/ServiceDetail.vue')
      },
      {
        path: '/register',
        name: 'register',
        component: () => import('@/pages/Register.vue'),
        meta: { guest: true }
      },
      {
        path: '/oauth/callback',
        name: 'oauth-callback',
        component: () => import('@/pages/OAuthCallback.vue')
      }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router