import { post, get } from './api'
import type { LoginRequest, LoginResponse, User } from '../types/auth'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await post<LoginResponse>('/auth/login', payload)
  return res.data
}

export async function logout(): Promise<void> {
  await post('/auth/logout')
}

export async function getProfile(): Promise<User> {
  const res = await get<User>('/auth/profile')
  return res.data
}
