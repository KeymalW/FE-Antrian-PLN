import { get, post, put } from './api'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import {
  mockCallQueue,
  mockCompleteQueue,
  mockGetLastCalled,
  mockGetQueueList,
  mockGetQueueStats,
  mockSkipQueue,
  mockTakeTicket,
} from '../mocks/mockBackend'
import type { QueueTicket, QueueStats, CallRequest, ServiceType } from '../types/queue'

export async function getQueueList(params?: {
  status?: string
  serviceType?: string
  page?: number
  perPage?: number
}): Promise<QueueTicket[]> {
  if (USE_MOCK_DATA) {
    return mockGetQueueList(params)
  }

  const res = await get<QueueTicket[]>('/queue', params as Record<string, unknown>)
  return res.data
}

export async function takeTicket(serviceType: ServiceType): Promise<QueueTicket> {
  if (USE_MOCK_DATA) {
    return mockTakeTicket(serviceType)
  }

  const res = await post<QueueTicket>('/queue/take', { serviceType })
  return res.data
}

export async function callQueue(payload: CallRequest): Promise<QueueTicket> {
  if (USE_MOCK_DATA) {
    return mockCallQueue(payload)
  }

  const res = await put<QueueTicket>(`/queue/${payload.queueId}/call`, {
    counterNumber: payload.counterNumber,
  })
  return res.data
}

export async function skipQueue(queueId: string): Promise<QueueTicket> {
  if (USE_MOCK_DATA) {
    return mockSkipQueue(queueId)
  }

  const res = await put<QueueTicket>(`/queue/${queueId}/skip`)
  return res.data
}

export async function completeQueue(queueId: string): Promise<QueueTicket> {
  if (USE_MOCK_DATA) {
    return mockCompleteQueue(queueId)
  }

  const res = await put<QueueTicket>(`/queue/${queueId}/complete`)
  return res.data
}

export async function getQueueStats(): Promise<QueueStats> {
  if (USE_MOCK_DATA) {
    return mockGetQueueStats()
  }

  const res = await get<QueueStats>('/queue/stats')
  return res.data
}

export async function getLastCalled(counterNumber: number): Promise<QueueTicket | null> {
  if (USE_MOCK_DATA) {
    return mockGetLastCalled(counterNumber)
  }

  const res = await get<QueueTicket | null>(`/queue/last-called/${counterNumber}`)
  return res.data
}

export async function clearQueueHistory(): Promise<void> {
  if (USE_MOCK_DATA) {
    const { mockClearQueueHistory } = await import('../mocks/mockBackend')
    return mockClearQueueHistory()
  }

  await post('/queue/clear-history', {})
}
