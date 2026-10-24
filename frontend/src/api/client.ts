import axios from 'axios'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 回應攔截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)

    // 登入過期才導去登入頁；前台、後台登入請求本身的 401 是帳號密碼錯誤，留在原頁面顯示訊息
    const isLoginRequest = /\/auth\/(admin\/)?login$/.test(error.config?.url || '')
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
    }

    // 後台 API 需要後台登入（含驗證碼）才能用
    if (error.response?.status === 403 && error.response.data?.code === 'ADMIN_LOGIN_REQUIRED') {
      window.location.href = '/admin/login'
    }

    if (!error.response) {
      return Promise.reject({
        success: false,
        message: error.code === 'ECONNABORTED' ? '連線逾時' : '無法連線到伺服器',
        hint: '請確認網路連線後再試'
      })
    }

    return Promise.reject(error.response.data || { success: false, message: '請求失敗' })
  }
)

export default apiClient
