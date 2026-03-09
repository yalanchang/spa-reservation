import { defineStore } from 'pinia'
import type { Service } from '@/types'
import apiClient from '@/api/client'

interface ServicesState {
  services: Service[]
  categories: any[]
  loading: boolean
}

export const useServicesStore = defineStore('services', {
  state: (): ServicesState => ({
    services: [],
    categories: [],
    loading: false
  }),

  getters: {
    getServicesByCategory: (state) => (categoryId: number) => {
      return state.services.filter(s => s.category_id === categoryId)
    }
  },

  actions: {
    async fetchServices() {
      this.loading = true
      try {
        const response = await apiClient.get<Service[]>('/services')as any
        if (response.success && response.data) {
          this.services = response.data
        }
      } catch (error) {
        console.error('Fetch services failed:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchCategories() {
      try {
        const response = await apiClient.get('/services/categories')as any
        if (response.success && response.data) {
          this.categories = response.data
        }
      } catch (error) {
        console.error('Fetch categories failed:', error)
      }
    }
  }
})