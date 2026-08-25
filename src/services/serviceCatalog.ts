import { get, post, put, del } from './api'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import type {
  CreateServiceInput,
  ServiceDefinition,
  UpdateServiceInput,
} from '../types/admin'

export async function getServices(): Promise<ServiceDefinition[]> {
  if (USE_MOCK_DATA) {
    const { mockGetServices } = await import('../mocks/mockBackend')
    return mockGetServices()
  }

  const res = await get<ServiceDefinition[]>('/services')
  return res.data
}

export async function createService(input: CreateServiceInput): Promise<ServiceDefinition> {
  if (USE_MOCK_DATA) {
    const { mockCreateService } = await import('../mocks/mockBackend')
    return mockCreateService(input)
  }

  const res = await post<ServiceDefinition>('/services', input)
  return res.data
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<ServiceDefinition> {
  if (USE_MOCK_DATA) {
    const { mockUpdateService } = await import('../mocks/mockBackend')
    return mockUpdateService(id, input)
  }

  const res = await put<ServiceDefinition>(`/services/${id}`, input)
  return res.data
}

export async function deleteService(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const { mockDeleteService } = await import('../mocks/mockBackend')
    return mockDeleteService(id)
  }

  await del(`/services/${encodeURIComponent(id)}`)
}
