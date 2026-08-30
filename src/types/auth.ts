export type UserRole = 'admin' | 'petugas' | 'kiosk' | 'tvdisplay'

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  counterNumber: number | null
  tenantId?: number | null
  tenantSlug?: string | null
}

export interface Tenant {
  id: number
  name: string
  slug: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
  tenant?: Tenant
}

export interface RegisterRequest {
  companyName: string
  name: string
  username: string
  password: string
  password_confirmation: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
