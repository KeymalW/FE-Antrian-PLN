import { get, post, put, del } from './api'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import type { CreateAccountInput, UpdateAccountInput } from '../types/admin'
import type { User } from '../types/auth'

export async function getAccounts(): Promise<User[]> {
  if (USE_MOCK_DATA) {
    const { mockGetAccounts } = await import('../mocks/mockBackend')
    return mockGetAccounts()
  }

  const res = await get<User[]>('/accounts')
  return res.data
}

export async function createAccount(input: CreateAccountInput): Promise<User> {
  if (USE_MOCK_DATA) {
    const { mockCreateAccount } = await import('../mocks/mockBackend')
    return mockCreateAccount(input)
  }

  const res = await post<User>('/accounts', input)
  return res.data
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<User> {
  if (USE_MOCK_DATA) {
    const { mockUpdateAccount } = await import('../mocks/mockBackend')
    return mockUpdateAccount(id, input)
  }

  const res = await put<User>(`/accounts/${encodeURIComponent(id)}`, input)
  return res.data
}

export async function deleteAccount(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const { mockDeleteAccount } = await import('../mocks/mockBackend')
    return mockDeleteAccount(id)
  }

  await del(`/accounts/${encodeURIComponent(id)}`)
}
