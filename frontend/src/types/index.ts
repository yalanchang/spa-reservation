// 用戶類型
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff' | 'customer'
  phone?: string
  avatar?: string
  created_at?: string
}

// 服務類型
export interface Service {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  duration: number
  image_url?: string
  category_name?: string
  sort_order?: number
  is_active?: boolean
}

// 服務分類類型
export interface ServiceCategory {
  id: number
  name: string
  description?: string
  image_url?: string
  sort_order?: number
}

// 美容師類型
export interface Staff {
  id: number
  name: string
  title: string
  avatar?: string
  bio?: string
  years_experience: number
  is_active?: boolean
}

// 預約類型
export interface Appointment {
  id: number
  appointment_no: string
  user_id?: number
  staff_id: number
  service_id: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  appointment_date: string
  start_time: string
  end_time: string
  duration: number
  price: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_at?: string
  service?: Service
  staff?: Staff
}

// 基礎 API 回應類型
export interface BaseApiResponse {
  success: boolean
  message?: string
}

// 通用 API 回應類型 (有資料)
export interface ApiResponse<T = any> extends BaseApiResponse {
  data?: T
}

// 登入回應資料類型
export interface LoginResponseData {
  token: string
  user: User
}

// 登入回應類型
export type LoginResponse = ApiResponse<LoginResponseData>

// 獲取用戶資料回應類型
export type UserResponse = ApiResponse<{ user: User }>

// 獲取服務列表回應類型
export type ServicesResponse = ApiResponse<Service[]>

// 獲取美容師列表回應類型
export type StaffResponse = ApiResponse<Staff[]>

// 獲取預約列表回應類型
export type AppointmentsResponse = ApiResponse<Appointment[]>

// 分頁回應類型
export interface PaginatedResponse<T = any> extends BaseApiResponse {
  data?: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 登入請求類型
export interface LoginRequest {
  email: string
  password: string
}

// 註冊請求類型
export interface RegisterRequest {
  name: string
  email: string
  password: string
  phone?: string
}

// 預約請求類型
export interface CreateAppointmentRequest {
  serviceId: number
  staffId?: number
  date: string
  time: string
  customerName: string
  customerPhone: string
  notes?: string
}
