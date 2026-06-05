export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  message: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}

export interface WebSocketMessage {
  type: 'queue_update' | 'queue_call' | 'queue_complete' | 'queue_skip' | 'stats_update'
  payload: unknown
}
