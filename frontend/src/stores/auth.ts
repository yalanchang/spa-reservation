import { defineStore } from 'pinia'
import apiClient from '@/api/client'

interface User {
  id: number
  name: string
  email: string
  role: string
  phone?: string
  avatar?: string 
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
    async login(email: string, password: string) {
      this.loading = true
      try {
        const response: any = await apiClient.post('/auth/login', {
          email,
          password
        })
        
        console.log('Login response:', response)
        
        // 檢查回應
        if (response && response.success && response.data) {
          this.token = response.data.token
          this.user = response.data.user
          localStorage.setItem('token', response.data.token)
          localStorage.setItem('user', JSON.stringify(response.data.user))
          return true
        }
        return false
      } catch (error: any) {
        console.error('Login failed:', error)
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
    },

    async fetchUser() {
      try {
        const response: any = await apiClient.get('/auth/me')
        if (response && response.success && response.data) {
          this.user = response.data.user
        }
      } catch (error) {
        console.error('Fetch user failed:', error)
      }
    },
    async fetchProfile() {
        try {
          const response: any = await apiClient.get('/auth/profile')
          if (response && response.success && response.data) {
            this.user = response.data
          }
        } catch (error) {
          console.error('Fetch profile failed:', error)
        }
      }
  }
})
