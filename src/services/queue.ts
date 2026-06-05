import { get, post, put } from './api'
import type { QueueTicket, QueueStats, CallRequest, ServiceType } from '../types/queue'

export async function getQueueList(params?: {
  status?: string
  serviceType?: string
  page?: number
  perPage?: number
}): Promise<QueueTicket[]> {
  const res = await get<QueueTicket[]>('/queue', params as Record<string, unknown>)
  return res.data
}

export async function takeTicket(serviceType: ServiceType): Promise<QueueTicket> {
  const res = await post<QueueTicket>('/queue/take', { serviceType })
  return res.data
}

export async function callQueue(payload: CallRequest): Promise<QueueTicket> {
  const res = await put<QueueTicket>(`/queue/${payload.queueId}/call`, {
    counterNumber: payload.counterNumber,
  })
  return res.data
}

export async function skipQueue(queueId: string): Promise<QueueTicket> {
  const res = await put<QueueTicket>(`/queue/${queueId}/skip`)
  return res.data
}

export async function completeQueue(queueId: string): Promise<QueueTicket> {
  const res = await put<QueueTicket>(`/queue/${queueId}/complete`)
  return res.data
}

export async function getQueueStats(): Promise<QueueStats> {
  const res = await get<QueueStats>('/queue/stats')
  return res.data
}

export async function getLastCalled(counterNumber: number): Promise<QueueTicket | null> {
  const res = await get<QueueTicket | null>(`/queue/last-called/${counterNumber}`)
  return res.data
}
