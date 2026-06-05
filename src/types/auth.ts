export type UserRole = 'admin' | 'petugas'

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  counterNumber: number | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
