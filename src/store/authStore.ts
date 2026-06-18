import { create } from 'zustand'
import type { User } from '../types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

function loadFromStorage(): { user: User | null; token: string | null; isAuthenticated: boolean } {
  try {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      return {
        user: JSON.parse(userStr) as User,
        token,
        isAuthenticated: true,
      }
    }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
  return { user: null, token: null, isAuthenticated: false }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadFromStorage(),

  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
