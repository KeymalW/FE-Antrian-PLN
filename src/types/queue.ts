export type QueueStatus = 'waiting' | 'called' | 'serving' | 'completed' | 'skipped'

export type ServiceType = 'pembayaran' | 'pengaduan' | 'pendaftaran' | 'informasi'

export interface QueueTicket {
  id: string
  queueNumber: string
  serviceType: ServiceType
  status: QueueStatus
  counterNumber: number | null
  createdAt: string
  calledAt: string | null
  completedAt: string | null
}

export interface QueueStats {
  total: number
  waiting: number
  called: number
  serving: number
  completed: number
  skipped: number
}

export interface CallRequest {
  queueId: string
  counterNumber: number
}

export interface CallResponse {
  queue: QueueTicket
  message: string
}
