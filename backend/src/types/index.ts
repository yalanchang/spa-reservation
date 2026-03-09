export interface User {
  id: number
  name: string
  email: string
  password: string
  role: 'admin' | 'staff' | 'customer'
  phone?: string
  is_active: boolean
  last_login?: Date
  created_at: Date
  updated_at: Date
}

export interface Service {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  duration: number
  image_url?: string
  is_active: boolean
}

export interface Staff {
  id: number
  user_id?: number
  name: string
  title: string
  bio?: string
  avatar?: string
  years_experience: number
  is_active: boolean
}

export interface Appointment {
  id: number
  appointment_no: string
  user_id?: number
  staff_id: number
  service_id: number
  customer_name: string
  customer_phone: string
  appointment_date: string
  start_time: string
  end_time: string
  duration: number
  price: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
}

export interface JwtPayload {
  userId: number
  email: string
  role: string
}
