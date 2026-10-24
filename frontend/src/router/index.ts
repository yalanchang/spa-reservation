import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { hasAdminSession } from '@/utils/token'

const router = createRouter({
  history: createWebHistory(),
  // 換頁時回到最上面；按上一頁則回到原本的位置。等換頁動畫（App.vue 的 page transition）淡出後再捲動
  scrollBehavior(to, from, savedPosition) {
    // 同一頁只改網址參數（例如服務篩選）時不捲動
    if (to.path === from.path && !savedPosition) return false
    return new Promise((resolve) => {
      setTimeout(() => resolve(savedPosition || { top: 0 }), 260)
    })
  },
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
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/ForgotPassword.vue')
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('@/pages/VerifyEmail.vue')
    },
    {
      path: '/admin/forgot-password',
      name: 'admin-forgot-password',
      component: () => import('@/pages/ForgotPassword.vue'),
      props: { variant: 'admin' },
      meta: { layout: 'admin' }
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/admin/AdminLogin.vue'),
      meta: { layout: 'admin', adminGuest: true }
    },
    {
      // 後台用自己的版型，不顯示前台導覽列與頁尾
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresStaff: true, layout: 'admin' },
      children: [
        { path: '', redirect: '/admin/appointments' },
        {
          path: 'appointments',
          name: 'admin-appointments',
          component: () => import('@/pages/admin/AdminAppointments.vue'),
          meta: { title: '預約管理' }
        },
        {
          path: 'reviews',
          name: 'admin-reviews',
          component: () => import('@/pages/admin/AdminReviews.vue'),
          meta: { title: '心得管理' }
        },
        {
          path: 'customers',
          name: 'admin-customers',
          component: () => import('@/pages/admin/AdminCustomers.vue'),
          meta: { title: '會員管理' }
        },
        {
          path: 'services',
          name: 'admin-services',
          component: () => import('@/pages/admin/AdminServices.vue'),
          meta: { title: '療程管理', requiresAdmin: true }
        },
        {
          path: 'staff',
          name: 'admin-staff',
          component: () => import('@/pages/admin/AdminStaff.vue'),
          meta: { title: '美容師與排班', requiresAdmin: true }
        },
        {
          path: 'closures',
          name: 'admin-closures',
          component: () => import('@/pages/admin/AdminClosures.vue'),
          meta: { title: '公休日', requiresAdmin: true }
        },
        {
          path: 'coupons',
          name: 'admin-coupons',
          component: () => import('@/pages/admin/AdminCoupons.vue'),
          meta: { title: '優惠碼', requiresAdmin: true }
        },
        {
          path: 'announcements',
          name: 'admin-announcements',
          component: () => import('@/pages/admin/AdminAnnouncements.vue'),
          meta: { title: '跑馬燈公告', requiresAdmin: true }
        },
        {
          path: 'reports',
          name: 'admin-reports',
          component: () => import('@/pages/admin/AdminReports.vue'),
          meta: { title: '營運報表', requiresAdmin: true }
        },
        {
          path: 'logs',
          name: 'admin-logs',
          component: () => import('@/pages/admin/AdminLogs.vue'),
          meta: { title: '操作紀錄', requiresAdmin: true }
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/pages/admin/AdminUsers.vue'),
          meta: { title: '管理員', requiresAdmin: true }
        }
      ]
    },
    {
      path: '/coupons',
      name: 'coupons',
      component: () => import('@/pages/Coupons.vue')
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/pages/Favorites.vue')
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

const isStaffRole = (role?: string) => ['admin', 'staff'].includes(role || '')

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 瀏覽器存的角色可能是舊的（例如剛被設成管理員），先向後端重新取一次
  if (to.meta.requiresStaff && authStore.isLoggedIn && !isStaffRole(authStore.user?.role)) {
    await authStore.fetchProfile()
  }

  // 後台要用後台登入頁取得的登入，前台登入的不算
  if (to.meta.requiresStaff && !hasAdminSession(authStore.token)) {
    next({ path: '/admin/login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresStaff && !isStaffRole(authStore.user?.role)) {
    // 前端只是擋畫面，真正的權限由後端檢查
    next({ path: '/admin/login', query: { denied: '1' } })
  } else if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    // 美容師帳號不能管理帳號權限
    next('/admin/appointments')
  } else if (to.meta.adminGuest && hasAdminSession(authStore.token) && isStaffRole(authStore.user?.role)) {
    next('/admin/appointments')
  } else if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router