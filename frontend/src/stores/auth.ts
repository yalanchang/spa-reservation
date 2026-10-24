import { defineStore } from 'pinia'
import apiClient from '@/api/client'

export interface User {
  id: number
  name: string
  email: string
  role: string
  phone?: string | null
  city?: string | null
  address?: string | null
  emergency_name?: string | null
  emergency_phone?: string | null
  invoice_carrier?: string | null
  tax_id?: string | null
  marketing_opt_in?: boolean
  avatar?: string | null
  birthday?: string | null
  gender?: string | null
  preferred_staff_id?: number | null
  skin_type?: string | null
  care_notes?: string | null
  created_at?: string
  has_password?: boolean
  google_linked?: boolean
  line_linked?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token'),
    loading: false
  }),

  getters: {
    isLoggedIn: (state) => !!state.token
  },

  actions: {
    // 登入成功後保存 token 與使用者資料
    setSession(token: string, user: User) {
      this.token = token
      this.user = user
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },

    // 回傳是否成功；失敗時帶上後端的錯誤代碼（例如 EMAIL_NOT_VERIFIED）與訊息
    async login(email: string, password: string): Promise<{ ok: boolean; code?: string; message?: string }> {
      this.loading = true
      try {
        const response: any = await apiClient.post('/auth/login', { email, password })
        if (response?.success && response.data) {
          this.setSession(response.data.token, response.data.user)
          return { ok: true }
        }
        return { ok: false, message: response?.message }
      } catch (error: any) {
        return { ok: false, code: error?.code, message: error?.message }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('remindedAppointments')
    },

    async fetchProfile() {
      try {
        const response: any = await apiClient.get('/auth/profile')
        if (response && response.success && response.data) {
          this.user = response.data
          localStorage.setItem('user', JSON.stringify(response.data))
        }
      } catch (error) {
        console.error('Fetch profile failed:', error)
      }
    }
  }
})
