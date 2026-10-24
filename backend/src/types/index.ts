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

export interface JwtPayload {
  userId: number
  email: string
  role: string
  mfa?: boolean
}
