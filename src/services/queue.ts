import { get, post, put, del } from './api'
import { USE_MOCK_DATA } from '../mocks/mockMode'
import {
  mockCallQueue,
  mockCompleteQueue,
  mockGetLastCalled,
  mockGetQueueList,
  mockGetQueueStats,
  mockGetTicketById,
  mockSkipQueue,
  mockTakeTicket,
} from '../mocks/mockBackend'
import type { QueueTicket, QueueStats, CallRequest, ServiceType } from '../types/queue'

export async function getWeeklyQueueList(): Promise<QueueTicket[]> {
  if (USE_MOCK_DATA) {
    return mockGetQueueList({ perPage: 1000 })
  }

  const res = await get<QueueTicket[]>('/queue/weekly')
  return res.data
}

export async function getQueueList(params?: {
  status?: string
  serviceType?: string
  page?: number
  perPage?: number
  from?: string
  to?: string
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

export async function getTicketById(id: string): Promise<QueueTicket | null> {
  if (USE_MOCK_DATA) {
    return mockGetTicketById(id)
  }

  const res = await get<QueueTicket | null>(`/queue/${id}`)
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

export async function restoreTicket(ticketId: string): Promise<QueueTicket> {
  if (USE_MOCK_DATA) {
    const { mockRestoreTicket } = await import('../mocks/mockBackend')
    return mockRestoreTicket(ticketId)
  }

  const res = await put<QueueTicket>(`/queue/${ticketId}/restore`)
  return res.data
}

export async function getTrashedTickets(): Promise<QueueTicket[]> {
  if (USE_MOCK_DATA) {
    const { mockGetTrashedTickets } = await import('../mocks/mockBackend')
    return mockGetTrashedTickets()
  }

  const res = await get<QueueTicket[]>('/queue/trash')
  return res.data
}

export async function emptyTrash(): Promise<void> {
  if (USE_MOCK_DATA) {
    const { mockEmptyTrash } = await import('../mocks/mockBackend')
    return mockEmptyTrash()
  }

  await del('/queue/trash')
}
