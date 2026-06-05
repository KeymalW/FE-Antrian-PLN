import { get, post } from './api'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import { mockGetProfile, mockLogin, mockLogout } from '../mocks/mockBackend'
import type { LoginRequest, LoginResponse, User } from '../types/auth'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  if (USE_MOCK_DATA) {
    return mockLogin(payload.username, payload.password)
  }

  const res = await post<LoginResponse>('/auth/login', payload)
  return res.data
}

export async function logout(): Promise<void> {
  if (USE_MOCK_DATA) {
    mockLogout()
    return
  }

  await post('/auth/logout')
}

export async function getProfile(): Promise<User> {
  if (USE_MOCK_DATA) {
    return mockGetProfile()
  }

  const res = await get<User>('/auth/profile')
  return res.data
}
